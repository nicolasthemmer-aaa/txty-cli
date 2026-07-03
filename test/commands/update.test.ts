import { test } from "@oclif/test";
import * as uuid from "uuid";
import { executeCypressCommand } from "../TestUtils";

describe("update", () => {
    before(async () => {
        await executeCypressCommand({ command: "clean" });
        await executeCypressCommand({ command: "load_seed_cli" });
    });

    test.command(["update"]).exit(2).it("fails without key name");

    test.command(["update", `app.missing-${uuid.v4()}`, "content"])
        .exit(1)
        .it("fails when the key does not exist");

    const key = `app.update-${uuid.v4()}`;
    test.command(["add", key, "old value"]).it("creates the key used for the update");
    test.command(["update", key, "new value"]).it("updates the translation of an existing key");

    const pluralKey = `app.apples-${uuid.v4()}`;
    test.command(["add", pluralKey, "%{count} apples", "--one", "%{count} apple"]).it(
        "creates the pluralized key used for the update"
    );
    test.command(["update", pluralKey, "%{count} apples!", "--one", "%{count} apple!"]).it(
        "updates the plural forms of an existing key"
    );
});
