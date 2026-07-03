import { API } from "./API";

const TranslationsAPI = {
    createTranslation: async (options: {
        projectId: string;
        languageId?: string;
        keyId: string;
        content?: string;
        pluralizationEnabled?: boolean;
        zero?: string;
        one?: string;
        two?: string;
        few?: string;
        many?: string;
    }) => {
        const translation: any = {
            content: options.content
        };

        if (options.pluralizationEnabled) {
            translation.zero = options.zero;
            translation.one = options.one;
            translation.two = options.two;
            translation.few = options.few;
            translation.many = options.many;
        }

        return API.postRequest(`projects/${options.projectId}/translations`, {
            language_id: options.languageId,
            key_id: options.keyId,
            translation: translation
        });
    }
};

export { TranslationsAPI };
