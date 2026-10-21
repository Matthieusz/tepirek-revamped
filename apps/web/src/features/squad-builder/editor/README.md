# Squad editor

`SquadBuilderEditorContent` in `squad-editor.tsx` accepts a resolved positive `groupId` and runs within the host's React Query provider. It owns editor UI, query observers, mutations, draft state, and save recovery. `squad-editor-state.ts` and `squad-group-draft.ts` expose the pure transition and placement interfaces exercised by colocated tests.

Routes own URL parsing, access/loader coordination, invalid-ID rendering, and the lazy route boundary. Import the editor directly from the lazy route's page, not from query options or a feature-wide barrel: eager loaders must not pull editor UI into the initial bundle.

Presentation helpers used by both the editor and route-local account/library screens live in `../shared/`. Simple route-local screens remain under routes.
