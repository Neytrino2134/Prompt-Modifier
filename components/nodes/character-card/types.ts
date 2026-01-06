
export interface CharacterData {
    id: string;
    name: string;
    index: string;
    image: string | null;
    thumbnails: Record<string, string | null>;
    selectedRatio: string;
    prompt: string;
    additionalPrompt?: string;
    fullDescription: string;
    targetLanguage?: string;
    isOutput?: boolean;
    isDescriptionCollapsed?: boolean;
    // Internal fields for drag/drop
    imageSources?: Record<string, string | null>;
    _fullResActive?: string | null;
}
