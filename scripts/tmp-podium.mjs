import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("prisma/dev.db");
const rows = db
  .prepare(
    "SELECT id, name, shortName, color FROM Team WHERE shortName IN ('SOUP','KITA','KIITA','BUNS') OR name LIKE '%Soup%' OR name LIKE '%Kita%' OR name LIKE '%Bun%'",
  )
  .all();
console.log(JSON.stringify(rows, null, 2));
