import express from "express";
import bedrockRouter from "./server/bedrock/bedrock.controller";
import { fetchToolRouter } from "./server/bedrock/tools/fetch/fetch.controller";
import { ldapToolRouter } from "./server/bedrock/tools/ldapTool/ldap.controller";

const app = express();
app.use(express.json({ limit: "500mb" }));
// next line commented out because we are only using json
// app.use(express.urlencoded({limit: '500mb', extended: true}));

app.use("/api/bedrock", bedrockRouter);

// Tool routes
app.use("/api/tools/fetch", fetchToolRouter);
app.use("/api/tools/ldap", ldapToolRouter);

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
