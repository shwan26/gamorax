import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load socket-server/.env no matter where you run from
dotenv.config({ path: path.join(__dirname, "..", ".env") });
