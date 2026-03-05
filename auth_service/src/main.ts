import { config } from "dotenv";
config({ path: "./.env" });

import app from "./app";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Auth service is running on port ${PORT}`);
});