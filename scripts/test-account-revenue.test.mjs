import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("test-account payments remain recorded but never contribute revenue", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table "user" (id text primary key, email text not null);
      create table payments (
        id text primary key, user_id text, amount integer,
        status text, counts_revenue boolean default true,
        confirmed_at timestamptz default now()
      );
      insert into "user" values
        ('test', 'Ygodds18@gmail.com'),
        ('normal', 'customer@example.com');
      insert into payments (id, user_id, amount, status) values
        ('old-test', 'test', 350, 'confirmed'),
        ('old-normal', 'normal', 800, 'confirmed');
    `);
    await db.exec(await readFile(new URL("../migrations/0007_test_accounts.sql", import.meta.url), "utf8"));
    assert.deepEqual((await db.query("select email from test_accounts")).rows, [
      { email: "ygodds18@gmail.com" },
    ]);
    assert.equal((await db.query("select counts_revenue from payments where id = 'old-test'")).rows[0].counts_revenue, false);

    await db.exec(`
      insert into payments (id, user_id, amount, status) values
        ('new-test', 'test', 1700, 'pending'),
        ('new-normal', 'normal', 350, 'pending');
      update payments set status = 'confirmed', counts_revenue = true
        where id in ('new-test', 'new-normal');
    `);
    assert.deepEqual((await db.query(`
      select id, status, counts_revenue from payments where user_id = 'test' order by id
    `)).rows, [
      { id: "new-test", status: "confirmed", counts_revenue: false },
      { id: "old-test", status: "confirmed", counts_revenue: false },
    ]);
    const revenue = await db.query(`
      select sum(amount)::integer as total,
        sum(amount) filter (where confirmed_at::date = current_date)::integer as daily
      from payments where status = 'confirmed' and counts_revenue is not false
    `);
    assert.deepEqual(revenue.rows, [{ total: 1150, daily: 1150 }]);
    assert.equal((await db.query("select count(*)::integer as count from payments")).rows[0].count, 4);
  } finally {
    await db.close();
  }
});
