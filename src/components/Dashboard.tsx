"use client";

import { useEffect, useRef, useState } from "react";
import ChatPanel from "@/src/components/ChatPanel";
import ChangesPanel from "@/src/components/ChangesPanel";
import CommitDialog from "@/src/components/CommitDialog";
import EditorStatusBar from "@/src/components/EditorStatusBar";
import FileExplorer from "@/src/components/FileExplorer";
import Header from "@/src/components/Header";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/src/components/ui/resizable";
import { useDashboardAuth } from "./dashboard/hooks/useDashboardAuth";
import { useEditorWorkspace } from "./dashboard/hooks/useEditorWorkspace";
import { useKeyboardShortcuts } from "./dashboard/hooks/useKeyboardShortcuts";
import { EditorArea } from "./dashboard/EditorArea";
import { CommandMenuDialog } from "./dashboard/CommandMenuDialog";
import { RepoSelectorDialog } from "./dashboard/RepoSelectorDialog";
import { ConflictBanner } from "./dashboard/ConflictBanner";

export default function Dashboard() {
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [changesPanelOpen, setChangesPanelOpen] = useState(false);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const bootstrapStartedRef = useRef(false);

  const workspace = useEditorWorkspace();
  const auth = useDashboardAuth({
    onLogoutCleanup: workspace.resetWorkspace,
  });

  const openRepositoryPicker = () => {
    setRepoModalOpen(true);
    void workspace.fetchRepositories();
  };

  // On mount: check session, load Supabase workspace hint, then fetch repos
  useEffect(() => {
    if (bootstrapStartedRef.current) return;
    bootstrapStartedRef.current = true;

    async function bootstrap() {
      try {
        // Step 1: Verify auth session
        const authRes = await fetch("/api/auth/me");
        if (!authRes.ok) {
          workspace.resetWorkspace();
          return;
        }
        const authData = await authRes.json();
        if (!authData.user) {
          workspace.resetWorkspace();
          return;
        }
        auth.setAuthenticatedUser(authData.user);

        // Step 2: Load the user's last workspace from Supabase (cross-device restore)
        let workspaceHint = null;
        try {
          const wsRes = await fetch("/api/workspaces");
          if (wsRes.ok) {
            const wsData = await wsRes.json();
            if (wsData.workspace) {
              workspaceHint = {
                repoOwner: wsData.workspace.repo_owner,
                repoName: wsData.workspace.repo_name,
                selectedBranch: wsData.workspace.selected_branch,
              };
            }
          }
        } catch (err) {
          console.warn("Could not load workspace hint from Supabase:", err);
        }

        // Step 3: Fetch repos and auto-select using the workspace hint
        await workspace.fetchRepositories(workspaceHint);
      } catch (err) {
        console.error("Auth bootstrap failed:", err);
      } finally {
        auth.setAuthLoading(false);
      }
    }

    void bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyboardShortcuts({
    onOpenCommand: () => setCommandOpen(true),
    onSave: () => void workspace.handleSave(),
  });

  return (
    <main className="flex h-screen min-h-[520px] flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Header
        repositoryName={workspace.selectedRepository ? workspace.selectedRepository.repo : "demo-project"}
        hasModifiedFile={Boolean(workspace.selectedFile?.isModified)}
        changedCount={workspace.changedFiles.length}
        isCommitting={workspace.isCommitting}
        onOpenChanges={() => setChangesPanelOpen(true)}
        onCommit={() => setCommitDialogOpen(true)}
        onCommandOpen={() => setCommandOpen(true)}
        user={auth.authenticatedUser}
        authLoading={auth.authLoading}
        selectedRepository={workspace.selectedRepository}
        hasMultipleRepos={workspace.repositories.length > 1}
        installationId={workspace.installationId}
        onOpenRepoModal={openRepositoryPicker}
        onLogout={auth.handleLogout}
        onSignIn={auth.handleGitHubSignIn}
        pendingAIEditList={workspace.pendingAIEditList}
        selectedPath={workspace.selectedPath}
        onSelectPath={workspace.setSelectedPath}
        onAcceptAIEdit={workspace.acceptAIEdit}
        onRejectAIEdit={workspace.rejectAIEdit}
        onAcceptAllAIEdits={workspace.acceptAllAIEdits}
        onRejectAllAIEdits={workspace.rejectAllAIEdits}
      />

      <ResizablePanelGroup className="flex-1 flex-row">
        <ResizablePanel defaultSize={20} className="max-[1120px]:min-w-0">
          <FileExplorer
            files={workspace.repositoryTree}
            selectedPath={workspace.selectedPath}
            openFiles={workspace.openFiles}
            onFileSelect={workspace.handleFileSelect}
            isAuthenticated={Boolean(auth.authenticatedUser)}
            selectedRepository={workspace.selectedRepository}
            authLoading={auth.authLoading}
            repoLoading={workspace.treeLoading}
            onRefresh={workspace.handleRefreshTree}
            onOpenRepoModal={openRepositoryPicker}
            onSignIn={auth.handleGitHubSignIn}
            changedFiles={workspace.changedFiles}
            onCreateFile={workspace.handleCreateFile}
            onCreateFolder={workspace.handleCreateFolder}
            onRename={workspace.handleRename}
            onDelete={workspace.handleDelete}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={55}>
          <EditorArea
            isLoading={auth.authLoading || workspace.treeLoading}
            isGitHubConnected={Boolean(auth.authenticatedUser)}
            onConnectGitHub={auth.handleGitHubSignIn}
            selectedFile={workspace.selectedFile}
            selectedRepository={workspace.selectedRepository}
            openFiles={workspace.openFiles}
            selectedPath={workspace.selectedPath}
            onSelectPath={workspace.setSelectedPath}
            onCloseTab={workspace.handleCloseTab}
            onContentChange={workspace.handleContentChange}
            pendingAIEdits={workspace.pendingAIEdits}
            pendingAIEditList={workspace.pendingAIEditList}
            onAcceptAIEdit={workspace.acceptAIEdit}
            onRejectAIEdit={workspace.rejectAIEdit}
            onAcceptAllAIEdits={workspace.acceptAllAIEdits}
            onRejectAllAIEdits={workspace.rejectAllAIEdits}
          />
        </ResizablePanel>

        <ResizableHandle className="max-[800px]:hidden" />

        <ResizablePanel defaultSize={25} className="max-[800px]:hidden">
          <ChatPanel
            workspace={{
              repository: workspace.selectedRepository
                ? `${workspace.selectedRepository.owner}/${workspace.selectedRepository.repo}`
                : "local workspace",
              branch: workspace.selectedRepository?.branch ?? workspace.selectedRepository?.defaultBranch ?? "local",
              files: workspace.workspaceFiles,
              currentFile: workspace.selectedFile?.path ?? null,
            }}
            onProposedEdit={workspace.applyAIProposal}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <EditorStatusBar
        fileName={workspace.selectedFile?.name ?? null}
        language={workspace.selectedFile?.language ?? null}
        isModified={Boolean(workspace.selectedFile?.isModified)}
        canDiscard={Boolean(workspace.selectedFile?.isModified)}
        onSave={workspace.handleSave}
        onDiscard={workspace.handleDiscard}
        indexedDbStatus={workspace.indexedDbStatus}
      />

      <ConflictBanner
        message={workspace.remoteConflict}
        onRefresh={() => {
          workspace.setRemoteConflict(null);
          void workspace.handleRefreshTree();
        }}
      />

      <ChangesPanel
        open={changesPanelOpen}
        onOpenChange={setChangesPanelOpen}
        changedFiles={workspace.changedFiles}
        onRevertFile={workspace.handleRevertFile}
      />

      {workspace.selectedRepository && (
        <CommitDialog
          open={commitDialogOpen}
          onOpenChange={setCommitDialogOpen}
          changedFiles={workspace.changedFiles}
          selectedRepository={workspace.selectedRepository}
          onCommitSuccess={workspace.handleCommitSuccess}
          onRefreshRepository={workspace.handleRefreshTree}
          onRevertFile={workspace.handleRevertFile}
          onRevertAll={workspace.handleRevertAll}
        />
      )}

      <CommandMenuDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        hasMultipleRepos={workspace.repositories.length > 1}
        openFiles={workspace.openFiles}
        onOpenRepoModal={openRepositoryPicker}
        onSelectPath={workspace.setSelectedPath}
      />

      <RepoSelectorDialog
        open={repoModalOpen}
        onOpenChange={setRepoModalOpen}
        repositories={workspace.repositories}
        reposLoading={workspace.reposLoading}
        reposError={workspace.reposError}
        reposAuthExpired={workspace.reposAuthExpired}
        selectedRepository={workspace.selectedRepository}
        installationId={workspace.installationId}
        onSelectRepository={workspace.handleSelectRepository}
        onRetry={workspace.fetchRepositories}
        onReconnect={auth.handleGitHubSignIn}
      />
    </main>
  );
}
