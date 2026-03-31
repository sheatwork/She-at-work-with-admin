// // import { Pool } from "@neondatabase/serverless";
// // import { drizzle } from "drizzle-orm/neon-serverless";
// // import * as schema from "./schema";



// // const isProduction = process.env.NODE_ENV === "production";

// // // Optimized connection pool configuration for high traffic
// // const pool = new Pool({
// //   connectionString: process.env.DATABASE_URL,
// //   // Optimal pool size for Vercel serverless functions
// //   max: 10,                    // Maximum number of connections
// //   min: 2,                     // Minimum number of connections
// //   idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
// //   connectionTimeoutMillis: 5000, // Connection timeout: 5 seconds
// // });
// // export const db = drizzle(pool, {
// //   schema,
// //   logger: !isProduction,
// // });


// import { neon } from "@neondatabase/serverless";
// import { drizzle } from "drizzle-orm/neon-http";
// import * as schema from "./schema";

// const sql = neon(process.env.DATABASE_URL!);

// export const db = drizzle(sql, {
//   schema,
//   logger: process.env.NODE_ENV !== "production",
// });


import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// Required for WebSocket connections in Node.js (Vercel)
neonConfig.webSocketConstructor = ws;

// Enable connection caching across warm invocations
neonConfig.fetchConnectionCache = true;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // keep low for serverless — each instance gets its own pool
});

export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV !== "production",
});