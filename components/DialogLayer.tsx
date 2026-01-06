
import React, { useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import QuickSearchMenu from './QuickSearchMenu';
import QuickAddMenu from './QuickAddMenu';
import RadialMenu from './RadialMenu';
import { ContextMenu } from './ContextMenu';
import NodeAlignContextMenu from './NodeAlignContextMenu';
import ConnectionQuickAddMenu from './ConnectionQuickAddMenu';
import RenameDialog from './RenameDialog';
import PermissionDialog from './PermissionDialog';
import ConfirmDialog from './ConfirmDialog';
import PromptEditDialog from './PromptEditDialog';
import { CatalogView } from './CatalogView';
import ApiKeyDialog from './ApiKeyDialog';
import NodeDeleteConfirm from './NodeDeleteConfirm';
import SettingsDialog from './SettingsDialog';
import ErrorDialog from './ErrorDialog';
import { CatalogItemType } from '../hooks/useCatalog';

// We need to manage `isSettingsOpen` locally here since it was moved out of App.tsx
// But it's triggered from AppHeader. 
// Ideally, `SettingsDialog` state should be in context. 
// For this refactor, we will listen to a custom event dispatched by AppHeader to open it.

const DialogLayer: React.FC = () => {
    const context = useAppContext();
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

    React.useEffect(() => {
        const handler = () => setIsSettingsOpen(true);
        window.addEventListener('open-settings', handler);
        return () => window.removeEventListener('open-settings', handler);
    }, []);

    // Check for missing API key configuration on mount
    useEffect(() => {
        const checkKey = () => {
            const hasVisited = localStorage.getItem('hasVisited');
            // If user hasn't passed welcome screen (fresh install), let WelcomeScreen handle it.
            if (!hasVisited) return;

            const useDevKey = localStorage.getItem('settings_useDevKey') === 'true';
            const userKey = localStorage.getItem('settings_userApiKey');
            
            // If configured to use Personal Key (useDevKey=false) but no key is present, open settings.
            if (!useDevKey && !userKey) {
                setIsSettingsOpen(true);
            }
        };
        checkKey();
    }, []);

    if (!context) return null;

    const {
        isQuickSearchOpen, quickSearchPosition, handleCloseAddNodeMenus, onAddNode, getTransformedPoint,
        isQuickAddOpen, isQuickAddMenuPinned, quickAddPosition, effectiveTool, setActiveTool, toggleQuickAddMenuPin,
        isRadialMenuOpen, radialMenuPosition, setIsRadialMenuOpen, radialMenuSelectedItem, setRadialMenuSelectedItem,
        contextMenu, handleCloseContextMenu, quickSlots, updateQuickSlot, setAllQuickSlots, isContextMenuPinned, toggleContextMenuPin, viewTransform, handleZoomChange, scaleToSliderValue, sliderValueToScale,
        nodeContextMenu, handleCloseNodeContextMenu, handleAlignNodes, selectedNodeIds,
        isConnectionQuickAddOpen, connectionQuickAddInfo, handleCloseConnectionQuickAdd, handleAddNodeAndConnect,
        nodeDeleteConfirm, deleteNodeAndConnections, setIsInstantCloseEnabled, cancelDeleteNodes,
        renameInfo, confirmRename, setRenameInfo, deselectAllNodes, t,
        showDialog, requestPermission, declinePermission, // PermissionDialog
        confirmInfo, setConfirmInfo,
        promptEditInfo, confirmPromptEdit, setPromptEditInfo,
        isCatalogOpen, handleCloseCatalog, currentCatalogItems, catalogPath, navigateCatalogBack, navigateCatalogToFolder, createCatalogItem, handleAddGroupFromCatalog, renameCatalogItem, saveCatalogItemToDisk, deleteCatalogItem, triggerLoadFromFile, moveCatalogItem,
        libraryItems, currentLibraryItems, libraryPath, navigateBack, navigateToFolder, createLibraryItem, setPromptEditInfo: setLibEditInfo, updateLibraryItem, deleteLibraryItem, saveLibraryItemToDisk, triggerLoadLibraryFromFile, moveLibraryItem,
        characterCatalog, scriptCatalog, sequenceCatalog, onRenameCharacter, onRenameScript, onRenameSequence,
        isApiKeyDialogOpen, handleApiKeySelect, handleApiKeyDialogClose,
        addToast,
        handlePaste,
        error, setError // Ensure error state is available
    } = context;

    const handleAddNodeFromMenu = (type: any) => {
        let position = quickAddPosition;
        if (isQuickSearchOpen) {
            position = quickSearchPosition;
        }
        const transformedPosition = getTransformedPoint(position);
        onAddNode(type, transformedPosition);
        handleCloseAddNodeMenus();
    };

    const handleAddNodeFromRadial = (type: any) => {
        const transformedPosition = getTransformedPoint(radialMenuPosition);
        onAddNode(type, transformedPosition);
        setIsRadialMenuOpen(false);
        setRadialMenuSelectedItem(null);
    };

    return (
        <>
            <QuickSearchMenu
                isOpen={isQuickSearchOpen}
                position={quickSearchPosition}
                onClose={handleCloseAddNodeMenus}
                onAddNode={(type) => {
                    const transformedPosition = getTransformedPoint(quickSearchPosition);
                    onAddNode(type, transformedPosition);
                    handleCloseAddNodeMenus();
                }}
            />

            <QuickAddMenu
                isOpen={isQuickAddOpen || isQuickAddMenuPinned}
                position={quickAddPosition}
                onClose={handleCloseAddNodeMenus}
                onAddNode={handleAddNodeFromMenu}
                onToolChange={setActiveTool}
                activeTool={effectiveTool}
                isPinned={isQuickAddMenuPinned}
                onPinToggle={toggleQuickAddMenuPin}
                onPaste={handlePaste}
            />

            <RadialMenu
                isOpen={isRadialMenuOpen}
                position={radialMenuPosition}
                onClose={() => setIsRadialMenuOpen(false)}
                onAddNode={handleAddNodeFromRadial}
                onSelectItem={setRadialMenuSelectedItem}
            />

            <ContextMenu
                isOpen={!!contextMenu?.isOpen}
                position={contextMenu?.position || { x: 0, y: 0 }}
                onClose={handleCloseContextMenu}
                onToolSelect={setActiveTool}
                slots={quickSlots}
                onSlotUpdate={updateQuickSlot}
                onSetSlots={setAllQuickSlots}
                onAddNode={(type) => {
                    const pos = getTransformedPoint(contextMenu?.position || { x: 0, y: 0 });
                    onAddNode(type, pos);
                }}
                isPinned={isContextMenuPinned}
                onPinToggle={toggleContextMenuPin}
                zoom={viewTransform.scale}
                onZoomChange={handleZoomChange}
                scaleToSliderValue={scaleToSliderValue}
                sliderValueToScale={sliderValueToScale}
                onPaste={handlePaste}
            />

            <NodeAlignContextMenu
                isOpen={!!nodeContextMenu?.isOpen}
                position={nodeContextMenu?.position || { x: 0, y: 0 }}
                onClose={handleCloseNodeContextMenu}
                onAlign={(alignment) => handleAlignNodes(selectedNodeIds, alignment)}
            />

            <ConnectionQuickAddMenu
                isOpen={isConnectionQuickAddOpen}
                info={connectionQuickAddInfo}
                onClose={handleCloseConnectionQuickAdd}
                onSelect={handleAddNodeAndConnect}
            />

            {nodeDeleteConfirm && (
                <NodeDeleteConfirm
                    position={nodeDeleteConfirm.position}
                    onConfirm={(dontShow) => {
                        nodeDeleteConfirm.nodeIds.forEach(id => deleteNodeAndConnections(id));
                        if (dontShow) {
                            localStorage.setItem('settings_instantNodeClose', 'true');
                            setIsInstantCloseEnabled(true);
                        }
                        cancelDeleteNodes();
                    }}
                    onCancel={cancelDeleteNodes}
                    count={nodeDeleteConfirm.nodeIds.length}
                />
            )}

            <RenameDialog
                isOpen={!!renameInfo}
                initialValue={renameInfo?.currentTitle || ''}
                onConfirm={confirmRename}
                onClose={() => setRenameInfo(null)}
                title={
                    renameInfo?.type === 'group' ? t('dialog.rename.group.title') :
                        renameInfo?.type === 'catalog' ? t('dialog.rename.catalog.title') :
                            renameInfo?.type === 'node' ? t('dialog.rename.node.title') :
                                t('dialog.rename.title')
                }
                deselectAllNodes={deselectAllNodes}
            />

            <PermissionDialog
                isOpen={showDialog} // from usePermissions via context
                onAllow={requestPermission}
                onDecline={declinePermission}
            />

            <ConfirmDialog
                isOpen={!!confirmInfo}
                title={confirmInfo?.title || ''}
                message={confirmInfo?.message || ''}
                onConfirm={confirmInfo?.onConfirm || (() => { })}
                onClose={() => setConfirmInfo(null)}
            />
            
            <ErrorDialog 
                isOpen={!!error}
                message={error}
                onClose={() => setError(null)}
            />

            <PromptEditDialog
                isOpen={!!promptEditInfo}
                initialName={promptEditInfo?.name || ''}
                initialContent={promptEditInfo?.content || ''}
                onConfirm={confirmPromptEdit}
                onClose={() => setPromptEditInfo(null)}
                deselectAllNodes={deselectAllNodes}
            />
            
            <CatalogView
                isOpen={isCatalogOpen}
                onClose={handleCloseCatalog}
                currentCatalogItems={currentCatalogItems}
                catalogPath={catalogPath}
                onCatalogNavigateBack={navigateCatalogBack}
                onCatalogNavigateToFolder={navigateCatalogToFolder}
                onCreateCatalogFolder={() => createCatalogItem(CatalogItemType.FOLDER)}
                onAddGroupFromCatalog={(id) => handleAddGroupFromCatalog(id)}
                onRenameCatalogItem={(id, name) => setRenameInfo({ type: 'catalog', id, currentTitle: name })}
                onSaveCatalogItem={saveCatalogItemToDisk}
                onDeleteCatalogItem={deleteCatalogItem}
                onLoadCatalogItemFromFile={triggerLoadFromFile}
                onMoveCatalogItem={moveCatalogItem}

                libraryItems={currentLibraryItems}
                libraryPath={libraryPath}
                onNavigateBack={navigateBack}
                onNavigateToFolder={navigateToFolder}
                onCreateLibraryItem={createLibraryItem}
                onEditLibraryItem={setPromptEditInfo}
                onRenameLibraryItem={(id, name) => setRenameInfo({ type: 'library', id, currentTitle: name })}
                onDeleteLibraryItem={deleteLibraryItem}
                onSaveLibraryItem={saveLibraryItemToDisk}
                onLoadLibraryItemFromFile={triggerLoadLibraryFromFile}
                onMoveLibraryItem={moveLibraryItem}

                characterCatalog={characterCatalog}
                scriptCatalog={scriptCatalog}
                sequenceCatalog={sequenceCatalog}

                onRenameCharacter={(id, name) => setRenameInfo({ type: 'character', id, currentTitle: name })}
                onRenameScript={(id, name) => setRenameInfo({ type: 'script', id, currentTitle: name })}
                onRenameSequence={(id, name) => setRenameInfo({ type: 'sequence', id, currentTitle: name })}
            />

            {isApiKeyDialogOpen && (
                <ApiKeyDialog
                    onSelectKey={handleApiKeySelect}
                    onClose={handleApiKeyDialogClose}
                />
            )}

            <SettingsDialog 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                addToast={addToast} 
                setIsInstantCloseEnabled={setIsInstantCloseEnabled}
            />
        </>
    );
};

export default DialogLayer;
