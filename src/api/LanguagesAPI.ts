import { API } from "./API";

export interface ILanguageCode {
    id: string;
    type: "language_code";
    attributes: {
        id: string;
        name: string;
        code: string;
    };
}

export interface ILanguage {
    id: string;
    type: "language";
    attributes: {
        id: string;
        name: string;
        is_default: boolean;
    };
    relationships: {
        language_code: {
            data: { id: string; type: "language_code" } | null;
        };
    };
}

export interface IGetLanguagesResponse {
    data: ILanguage[];
    included?: ILanguageCode[];
    meta: { total: number };
}

const LanguagesAPI = {
    getLanguages: async (projectId: string): Promise<IGetLanguagesResponse> => {
        return API.getRequest(`projects/${projectId}/languages`, { show_all: true });
    },

    // Resolves a language identifier to the language's id for the given project.
    // Matching is done against the linked ISO language code (e.g. "en", "de") first
    // and falls back to a case-insensitive match against the language name.
    resolveLanguageId: async (projectId: string, identifier: string): Promise<string | null> => {
        const response: any = await LanguagesAPI.getLanguages(projectId);

        if (response.error || !response.data) {
            return null;
        }

        const languageCodeById: { [id: string]: string } = {};
        for (const included of response.included || []) {
            if (included.type === "language_code") {
                languageCodeById[included.id] = (included.attributes.code || "").toLowerCase();
            }
        }

        const target = identifier.toLowerCase();

        const byCode = response.data.find((language: any) => {
            const codeId =
                language.relationships &&
                language.relationships.language_code &&
                language.relationships.language_code.data &&
                language.relationships.language_code.data.id;

            return codeId ? languageCodeById[codeId] === target : false;
        });
        if (byCode) {
            return byCode.id;
        }

        const byName = response.data.find((language: any) => {
            return ((language.attributes && language.attributes.name) || "").toLowerCase() === target;
        });

        return byName ? byName.id : null;
    }
};

export { LanguagesAPI };
