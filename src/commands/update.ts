import { Command, Flags } from "@oclif/core";
import { ErrorUtils } from "../api/ErrorUtils";
import { KeysAPI } from "../api/KeysAPI";
import { LanguagesAPI } from "../api/LanguagesAPI";
import { TranslationsAPI } from "../api/TranslationsAPI";
import { Logger } from "../Logger";
import { Settings } from "../Settings";
import { Validators } from "../Validators";
import { showErrorFixSuggestions } from "../Suggestions";
import { projectConfig } from "../Config";
import * as nconf from "nconf";
import * as path from "path";
import { auth_email_flag } from "../flags/auth_email_flag";
import { auth_secret_flag } from "../flags/auth_secret_flag";
import { help_flag } from "../flags/help_flag";

export default class Update extends Command {
    static description = "update the translation content of an existing key";

    static flags = {
        help: help_flag,
        "project-path": Flags.string(),
        language: Flags.string({
            description:
                'The language to update the translation for, matched by its ISO code (e.g. "en", "de") or name. Defaults to the project\'s default language.'
        }),
        plural: Flags.boolean({
            description: "Enable pluralization for the key. Implied when a plural form flag is set.",
            default: false
        }),
        zero: Flags.string({ description: "Translation content for the plural form 'zero'." }),
        one: Flags.string({ description: "Translation content for the plural form 'one'." }),
        two: Flags.string({ description: "Translation content for the plural form 'two'." }),
        few: Flags.string({ description: "Translation content for the plural form 'few'." }),
        many: Flags.string({ description: "Translation content for the plural form 'many'." }),
        "auth-email": auth_email_flag,
        "auth-secret": auth_secret_flag
    };

    static args = [{ name: "name", required: true }, { name: "content" }];

    static examples = [
        '$ texterify update "app.title" "MyRenamedApp"',
        '$ texterify update "app.apples" "%{count} apples" --one "%{count} apple"',
        '$ texterify update "app.apples" "%{count} Äpfel" --one "%{count} Apfel" --language de'
    ];

    async run() {
        const { args, flags } = await this.parse(Update);
        Settings.setAuthCredentialsPassedViaCLI({
            email: flags["auth-email"],
            secret: flags["auth-secret"]
        });

        if (flags["project-path"]) {
            const configFilePath = path.join(flags["project-path"], "texterify.json");
            const newProjectStore = new nconf.Provider();
            newProjectStore.file({ file: configFilePath });
            projectConfig.setStore(newProjectStore);
            projectConfig.setKey("project_path", flags["project-path"]);
        }

        const projectId = Settings.getProjectID();
        Validators.ensureProjectId(projectId);

        const existingKey = await KeysAPI.findKeyByName(projectId, args.name);
        if (!existingKey) {
            Logger.error(`No key named "${args.name}" exists. Use "texterify add" to create it before updating.`);
            Validators.exitWithError(this);
        }

        const pluralForms = {
            zero: flags.zero,
            one: flags.one,
            two: flags.two,
            few: flags.few,
            many: flags.many
        };
        const hasPluralForm = Object.values(pluralForms).some((form) => {
            return form !== undefined;
        });
        const pluralizationEnabled = flags.plural || hasPluralForm;

        let languageId: string | undefined;
        if (flags.language) {
            const resolvedLanguageId = await LanguagesAPI.resolveLanguageId(projectId, flags.language);
            if (!resolvedLanguageId) {
                Logger.error(`Could not find a language matching "${flags.language}" in this project.`);
                Validators.exitWithError(this);
            }
            languageId = resolvedLanguageId || undefined;
        }

        let response: any;
        try {
            response = await TranslationsAPI.createTranslation({
                projectId: projectId,
                keyId: existingKey.attributes.id,
                content: args.content,
                languageId: languageId,
                pluralizationEnabled: pluralizationEnabled,
                ...pluralForms
            });
        } catch (error) {
            Logger.error("Failed to update key.");
            showErrorFixSuggestions(error);
            Validators.exitWithError(this);
        }

        if (response?.error === "NO_DEFAULT_LANGUAGE_SPECIFIED") {
            Logger.error(
                "You need to define a default language if you want to update translations for your default language directly."
            );
            Validators.exitWithError(this);
        } else if (response?.error) {
            ErrorUtils.getAndPrintErrors(response);
            Validators.exitWithError(this);
        } else {
            Logger.success(`Successfully updated key "${args.name}".`);
        }
    }
}
