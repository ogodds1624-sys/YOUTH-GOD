import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("activation is a separate one-time payment and preserves test-account exclusion", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table "user" (id text primary key, email text not null);
      create table payments (
        id text primary key, payer_name text, user_id text, amount integer,
        status text, counts_revenue boolean default true,
        confirmed_at timestamptz
      );
      insert into "user" values ('ghana', 'ghana@example.com'),
        ('nigeria', 'nigeria@example.com'), ('test', 'Ygodds18@gmail.com');
      insert into payments (id, payer_name, user_id, amount, status, counts_revenue, confirmed_at)
      values ('legacy', '', 'ghana', 350, 'confirmed', true, now());
    `);
    for (const name of ["0007_test_accounts.sql", "0008_activation_payments.sql"]) {
      await db.exec(await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
    }
    assert.equal((await db.query("select purpose from payments where id = 'legacy'")).rows[0].purpose, "session");
    await db.exec(`
      insert into payments (id, user_id, amount, status, purpose) values
        ('gh-activation', 'ghana', 50, 'pending', 'activation'),
        ('ng-activation', 'nigeria', 7000, 'pending', 'activation'),
        ('test-activation', 'test', 50, 'pending', 'activation');
    `);
    const activated = async (userId) => (await db.query(`
      select exists (select 1 from payments where user_id = $1
        and purpose = 'activation' and status = 'confirmed') as activated
    `, [userId])).rows[0].activated;
    assert.equal(await activated("ghana"), false);
    const access = async (userId) => (await db.query(`
      select exists (
        select 1 from payments p where p.user_id = $1 and p.purpose = 'session' and p.status = 'confirmed'
          and exists (select 1 from payments a where a.user_id = $1 and a.purpose = 'activation' and a.status = 'confirmed')
      ) as paid
    `, [userId])).rows[0].paid;
    assert.equal(await access("ghana"), false);
    const submitSession = async (id, userId) => (await db.query(`
      insert into payments (id, user_id, amount, status, purpose)
      select $1, $2, 350, 'pending', 'session'
      where exists (
        select 1 from payments a
        where a.user_id = $2 and a.purpose = 'activation' and a.status = 'confirmed'
      )
      returning id
    `, [id, userId])).rows;
    assert.deepEqual(await submitSession("blocked-pending", "ghana"), []);
    await assert.rejects(db.exec(`
      insert into payments (id, user_id, amount, status, purpose)
      values ('duplicate', 'ghana', 50, 'pending', 'activation')
    `), /duplicate key/);
    assert.deepEqual((await db.query(`
      insert into payments (id, user_id, amount, status, purpose)
      values ('concurrent-retry', 'ghana', 50, 'pending', 'activation')
      on conflict (user_id) where purpose = 'activation' and status in ('pending', 'confirmed')
      do update set user_id = excluded.user_id returning id
    `)).rows, [{ id: "gh-activation" }]);
    const revenue = async () => (await db.query(`
      select
        coalesce(sum(amount) filter (where amount <> 7000), 0)::integer as ghs_total,
        coalesce(sum(amount) filter (where amount = 7000), 0)::integer as ngn_total,
        coalesce(sum(amount) filter (
          where amount <> 7000 and (confirmed_at at time zone 'Africa/Accra')::date =
            (now() at time zone 'Africa/Accra')::date
        ), 0)::integer as ghs_daily,
        coalesce(sum(amount) filter (
          where amount = 7000 and (confirmed_at at time zone 'Africa/Lagos')::date =
            (now() at time zone 'Africa/Lagos')::date
        ), 0)::integer as ngn_daily
      from payments where status = 'confirmed' and counts_revenue is not false
    `)).rows[0];
    assert.deepEqual(await revenue(), {
      ghs_total: 350, ngn_total: 0, ghs_daily: 350, ngn_daily: 0,
    });
    await db.exec("update payments set status = 'confirmed', confirmed_at = now() where purpose = 'activation'");
    assert.deepEqual(await revenue(), {
      ghs_total: 400, ngn_total: 7000, ghs_daily: 400, ngn_daily: 7000,
    });
    assert.equal(await activated("ghana"), true);
    assert.equal(await activated("nigeria"), true);
    assert.equal(await access("ghana"), true);
    assert.equal(await access("nigeria"), false);
    assert.deepEqual(await submitSession("approved-session", "ghana"), [{ id: "approved-session" }]);
    assert.equal((await db.query("select counts_revenue from payments where id = 'test-activation'")).rows[0].counts_revenue, false);
    assert.equal((await db.query(`
      select count(*)::integer as count from payments
      where user_id = 'nigeria' and purpose = 'session' and status = 'confirmed'
    `)).rows[0].count, 0);
    await db.exec("update payments set status = 'rejected' where id = 'ng-activation'");
    assert.deepEqual(await revenue(), {
      ghs_total: 400, ngn_total: 0, ghs_daily: 400, ngn_daily: 0,
    });
    assert.equal(await activated("nigeria"), false);
    assert.deepEqual(await submitSession("blocked-rejected", "nigeria"), []);
    await db.exec(`
      insert into payments (id, user_id, amount, status, purpose)
      values ('ng-retry', 'nigeria', 7000, 'pending', 'activation')
    `);
    assert.equal((await db.query("select count(*)::integer as count from payments")).rows[0].count, 6);
  } finally {
    await db.close();
  }
});
