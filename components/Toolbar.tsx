
import React from 'react';
import { NodeType } from '../types';
import { useLanguage } from '../localization';
import { useAppContext } from '../contexts/AppContext';
import { TutorialTooltip } from './TutorialTooltip';
import { GoogleDriveIcon } from './icons/AppIcons'; // Import Drive Icon

interface ToolbarProps {
  onAddNode: (type: NodeType, e: React.MouseEvent) => void;
  onOpenSearch: () => void;
  onToggleCatalog: () => void;
  onSaveCanvas: () => void;
  onLoadCanvas: () => void;
  isDetached: boolean;
  onSaveProject?: () => void;
  isCompact?: boolean;
}

const ToolButton: React.FC<{
    title: string;
    onClick: (e: React.MouseEvent) => void;
    isActive?: boolean;
    children: React.ReactNode;
    hoverColorClass?: string;
}> = ({ title, onClick, isActive = false, children, hoverColorClass }) => {
    const baseClasses = "p-2 rounded-md transition-colors duration-200 focus:outline-none flex items-center justify-center h-9 w-9";
    // Theme refactoring: Use bg-accent for active state
    const activeClasses = "bg-accent text-white shadow-lg shadow-accent/20";
    // Theme refactoring: Use hover:bg-accent for hover state (or specific hover class if provided, though we default to accent now)
    const inactiveClasses = `bg-gray-700 ${hoverColorClass || 'hover:bg-accent hover:text-white'} text-gray-300`;

    return (
        <div className="relative group flex items-center">
            <button
                onClick={onClick}
                aria-label={title}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
            >
                {children}
            </button>
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-sm whitespace-nowrap rounded-md shadow-xl z-50 transition-opacity duration-200 opacity-0 pointer-events-none group-hover:opacity-100"
              role="tooltip"
            >
              {title}
            </div>
        </div>
    );
};

const ToolGroup: React.FC<{ title: string; children: React.ReactNode; isDetached?: boolean; hoverColorClass?: string; titleColorClass?: string; isCompact?: boolean }> = ({ title, children, isDetached, hoverColorClass, titleColorClass, isCompact }) => {
    const groupContainerClasses = `flex items-center space-x-1`;

    return (
        <div className="flex flex-col items-center">
            {!isDetached && !isCompact && <span className={`text-xs font-semibold mb-1 select-none ${titleColorClass || 'text-gray-400'}`}>{title}</span>}
            <div className={groupContainerClasses}>
                {React.Children.map(children, child =>
                    React.isValidElement(child)
                        ? React.cloneElement(child, { hoverColorClass } as any)
                        : child
                )}
            </div>
        </div>
    );
};


const Toolbar: React.FC<ToolbarProps> = ({ onAddNode, onOpenSearch, onToggleCatalog, onSaveCanvas, onLoadCanvas, isDetached, onSaveProject, isCompact }) => {
  const { t } = useLanguage();
  const context = useAppContext();
  const { tutorialStep, advanceTutorial, skipTutorial, handleSaveToDrive, isGoogleDriveSaving } = context || {};

  const containerClasses = isDetached
    ? "grid grid-cols-3 gap-2"
    : "flex items-center flex-wrap justify-center gap-2";

  // Removed specific color classes (e.g. hover:bg-blue-600) to allow the Theme (bg-accent) to control colors
  return (
    <div
        className={containerClasses}>
      
      <TutorialTooltip content={t('tutorial.group.catalog')} isActive={tutorialStep === 'toolbar_group_catalog'} position="top" onNext={advanceTutorial} onSkip={skipTutorial}>
          <ToolGroup title={t('toolbar.group.catalog')} isDetached={isDetached} isCompact={isCompact}>
            <ToolButton title={t('toolbar.addNode')} onClick={onOpenSearch}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </ToolButton>
            <ToolButton title={t('toolbar.catalog')} onClick={onToggleCatalog}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </ToolButton>
          </ToolGroup>
      </TutorialTooltip>

      <TutorialTooltip content={t('tutorial.group.general')} isActive={tutorialStep === 'toolbar_group_general'} position="top" onNext={advanceTutorial} onSkip={skipTutorial}>
        <ToolGroup title={t('toolbar.group.general')} isDetached={isDetached} isCompact={isCompact}>
          <ToolButton title={t('toolbar.addNote')} onClick={(e) => onAddNode(NodeType.NOTE, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
          </ToolButton>
          <ToolButton title={t('toolbar.addDataReader')} onClick={(e) => onAddNode(NodeType.DATA_READER, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
          </ToolButton>
        </ToolGroup>
      </TutorialTooltip>

      <TutorialTooltip content={t('tutorial.group.input')} isActive={tutorialStep === 'toolbar_group_input'} position="top" onNext={advanceTutorial} onSkip={skipTutorial}>
        <ToolGroup title={t('toolbar.group.input')} isDetached={isDetached} isCompact={isCompact}>
          <ToolButton title={t('toolbar.addTextInput')} onClick={(e) => onAddNode(NodeType.TEXT_INPUT, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 6h10M12 6v12" />
            </svg>
          </ToolButton>
          <ToolButton title={t('toolbar.addImageInput')} onClick={(e) => onAddNode(NodeType.IMAGE_INPUT, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <path d="M21 15l-5-5L5 21"></path>
            </svg>
          </ToolButton>
          <ToolButton title={t('search.node.media_viewer.title')} onClick={(e) => onAddNode(NodeType.MEDIA_VIEWER, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </ToolButton>
          <ToolButton title={t('toolbar.addPromptSequenceEditor')} onClick={(e) => onAddNode(NodeType.PROMPT_SEQUENCE_EDITOR, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
          </ToolButton>
        </ToolGroup>
      </TutorialTooltip>

      <TutorialTooltip content={t('tutorial.group.processing')} isActive={tutorialStep === 'toolbar_group_processing'} position="top" onNext={advanceTutorial} onSkip={skipTutorial}>
        <ToolGroup title={t('toolbar.group.processing')} isDetached={isDetached} isCompact={isCompact}>
          <ToolButton title={t('toolbar.addImageAnalyzer')} onClick={(e) => onAddNode(NodeType.IMAGE_ANALYZER, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.792V5.25a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h7.55" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 18.375L21 21" />
            </svg>
          </ToolButton>
          <ToolButton title={t('toolbar.addPromptAnalyzer')} onClick={(e) => onAddNode(NodeType.PROMPT_ANALYZER, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6M9 11h6M9 8h6" />
            </svg>
          </ToolButton>
          <ToolButton title={t('toolbar.addPromptProcessor')} onClick={(e) => onAddNode(NodeType.PROMPT_PROCESSOR, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.672-2.672L11.25 18l1.938-.648a3.375 3.375 0 002.672 2.672L16.25 13l.648 1.938a3.375 3.375 0 002.672 2.672L21.75 18l-1.938.648a3.375 3.375 0 00-2.672 2.672z" />
            </svg>
          </ToolButton>
        </ToolGroup>
      </TutorialTooltip>

      <TutorialTooltip content={t('tutorial.group.character')} isActive={tutorialStep === 'toolbar_group_character'} position="top" onNext={advanceTutorial} onSkip={skipTutorial}>
        <ToolGroup title={t('toolbar.group.character')} isDetached={isDetached} isCompact={isCompact}>
          <ToolButton title={t('toolbar.addCharacterGenerator')} onClick={(e) => onAddNode(NodeType.CHARACTER_GENERATOR, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
          </ToolButton>
          <ToolButton title={t('toolbar.addCharacterAnalyzer')} onClick={(e) => onAddNode(NodeType.CHARACTER_ANALYZER, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 9a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25c-3.1 0-5.88-1.5-7.5-3.75m15 3.75c-1.62-2.25-4.4-3.75-7.5-3.75S6.12 12 4.5 14.25" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
              </svg>
          </ToolButton>
          <ToolButton title={t('toolbar.addCharacterCard')} onClick={(e) => onAddNode(NodeType.CHARACTER_CARD, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 8a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a7.5 7.5 0 0115 0" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5a.75.75 0 00-.75.75v13.5c0 .414.336.75.75.75h16.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75H3.75z" />
            </svg>
          </ToolButton>
          <ToolButton title={t('search.node.pose_creator.title')} onClick={(e) => onAddNode(NodeType.POSE_CREATOR, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </ToolButton>
        </ToolGroup>
      </TutorialTooltip>

      <TutorialTooltip content={t('tutorial.group.output')} isActive={tutorialStep === 'toolbar_group_output'} position="top" onNext={advanceTutorial} onSkip={skipTutorial}>
        <ToolGroup title={t('toolbar.group.output')} isDetached={isDetached} isCompact={isCompact}>
          <ToolButton title={t('toolbar.addImageOutput')} onClick={(e) => onAddNode(NodeType.IMAGE_OUTPUT, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </ToolButton>
          <ToolButton title={t('toolbar.addImageEditor')} onClick={(e) => onAddNode(NodeType.IMAGE_EDITOR, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
          </ToolButton>
          <ToolButton title={t('toolbar.addImageSequenceGenerator')} onClick={(e) => onAddNode(NodeType.IMAGE_SEQUENCE_GENERATOR, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 5h12M6 9h12M6 13h12M6 17h12M3 3h2.5v18H3zm15.5 0H21v18h-2.5z" />
              </svg>
          </ToolButton>
        </ToolGroup>
      </TutorialTooltip>

      <TutorialTooltip content={t('tutorial.group.ai')} isActive={tutorialStep === 'toolbar_group_ai'} position="top" onNext={advanceTutorial} onSkip={skipTutorial}>
        <ToolGroup title={t('toolbar.group.aiTools')} isDetached={isDetached} isCompact={isCompact}>
          <ToolButton title={t('toolbar.addTranslator')} onClick={(e) => onAddNode(NodeType.TRANSLATOR, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L12 6l6 12M8 14h8" />
            </svg>
          </ToolButton>
          <ToolButton title={t('toolbar.addGeminiChat')} onClick={(e) => onAddNode(NodeType.GEMINI_CHAT, e)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </ToolButton>
        </ToolGroup>
      </TutorialTooltip>

      <TutorialTooltip content={t('tutorial.group.scripts')} isActive={tutorialStep === 'toolbar_group_scripts'} position="top" onNext={advanceTutorial} onSkip={skipTutorial}>
        <ToolGroup title={t('toolbar.group.scripts')} isDetached={isDetached} isCompact={isCompact}>
            <ToolButton title={t('toolbar.addScriptGenerator')} onClick={(e) => onAddNode(NodeType.SCRIPT_GENERATOR, e)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M10.5 16.5h3M15 19.5h-6a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 018.25 4.5h7.5a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0115.75 19.5h-1.5" />
                </svg>
            </ToolButton>
            <ToolButton title={t('toolbar.addScriptViewer')} onClick={(e) => onAddNode(NodeType.SCRIPT_VIEWER, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 19.82a2.25 2.25 0 01-1.897 1.13l-2.685.8.8-2.685a2.25 2.25 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </ToolButton>
        </ToolGroup>
      </TutorialTooltip>

      <TutorialTooltip content={t('tutorial.group.video')} isActive={tutorialStep === 'toolbar_group_video'} position="top" onNext={advanceTutorial} onSkip={skipTutorial}>
        <ToolGroup title={t('toolbar.group.video')} isDetached={isDetached} isCompact={isCompact}>
            <ToolButton title={t('toolbar.addVideoPromptProcessor')} onClick={(e) => onAddNode(NodeType.VIDEO_PROMPT_PROCESSOR, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7l-2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
              </svg>
            </ToolButton>
            <ToolButton title={t('toolbar.addVideoOutput')} onClick={(e) => onAddNode(NodeType.VIDEO_OUTPUT, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
              </svg>
            </ToolButton>
             <ToolButton title={t('node.title.video_editor')} onClick={(e) => onAddNode(NodeType.VIDEO_EDITOR, e)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </ToolButton>
        </ToolGroup>
      </TutorialTooltip>

      <TutorialTooltip content={t('tutorial.group.file')} isActive={tutorialStep === 'toolbar_group_file'} position="top" onNext={advanceTutorial} onSkip={skipTutorial}>
        <ToolGroup title={t('toolbar.group.file')} isDetached={isDetached} isCompact={isCompact}>
            <ToolButton title={t('toolbar.saveProject')} onClick={() => onSaveProject && onSaveProject()}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
            </ToolButton>
            
             {/* Save to Drive */}
             {/* 
             {handleSaveToDrive && (
                 <ToolButton title={t('toolbar.saveToDrive')} onClick={handleSaveToDrive}>
                    {isGoogleDriveSaving ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <GoogleDriveIcon />
                    )}
                 </ToolButton>
             )}
             */}

            <ToolButton title={t('toolbar.saveCanvas')} onClick={onSaveCanvas}>
                <svg width="24" height="24" viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                    <path d="M17.2928932,3.29289322 L21,7 L21,20 C21,20.5522847 20.5522847,21 20,21 L4,21 C3.44771525,21 3,20.5522847 3,20 L3,4 C3,3.44771525 3.44771525,3 4,3 L16.5857864,3 C16.8510029,3 17.1053568,3.10535684 17.2928932,3.29289322 Z" />
                    <rect width="10" height="8" x="7" y="13" />
                    <rect width="8" height="5" x="8" y="3" />
                </svg>
            </ToolButton>
            <ToolButton title={t('toolbar.loadCanvas')} onClick={onLoadCanvas}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
            </ToolButton>
        </ToolGroup>
      </TutorialTooltip>

    </div>
  );
};

export default React.memo(Toolbar);
