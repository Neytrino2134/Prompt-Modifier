
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
    isActive?: boolean; // Controls if the card is included in output and editable
    isDescriptionCollapsed?: boolean;
    isImageCollapsed?: boolean; // New: Collapse state for image area
    isPromptCollapsed?: boolean; // New: Collapse state for prompt area (includes modification request)
    // Internal fields for drag/drop
    imageSources?: Record<string, string | null>;
    _fullResActive?: string | null;
}
