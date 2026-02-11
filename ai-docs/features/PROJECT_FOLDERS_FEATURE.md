# Project Folders Feature

## Overview
This feature adds the ability to organize projects into folders within the project sidebar. Users can create custom folders, add existing projects to them, and organize their workflow more efficiently.

## Features

### 1. Create Project Folders
- Users can create new folders with custom names, descriptions, and colors
- Each folder has a unique color identifier for visual distinction
- Folders are stored per user and can contain multiple projects

### 2. Add Projects to Folders
- Existing projects can be added to folders using the "Add to Folder" button
- Projects can only be in one folder at a time
- The same project can be accessed both from the main projects list and from within folders

### 3. Manage Folders
- Edit folder names, descriptions, and colors
- Delete folders (projects are preserved, only removed from the folder)
- Collapsible folder interface for better organization

### 4. Visual Organization
- Color-coded folders for easy identification
- Collapsible sections for both projects and folders
- Consistent UI with the existing project sidebar

## Database Schema

### New Models

#### ProjectFolder
```prisma
model ProjectFolder {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  description String?
  color       String?  @default("#3B82F6")
  userId      String   @db.ObjectId
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user              User?                @relation(fields: [userId], references: [id])
  projectFolderItems ProjectFolderItem[]

  @@map("project-folders")
}
```

#### ProjectFolderItem
```prisma
model ProjectFolderItem {
  id             String        @id @default(auto()) @map("_id") @db.ObjectId
  folderId       String        @db.ObjectId
  projectId      String        @db.ObjectId
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  folder  ProjectFolder @relation(fields: [folderId], references: [id], onDelete: Cascade)
  project Projects      @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([folderId, projectId])
  @@map("project-folder-items")
}
```

## API Endpoints

### Project Folders
- `GET /api/project-folders` - Get all folders for the current user
- `POST /api/project-folders` - Create a new folder
- `PUT /api/project-folders` - Update an existing folder
- `DELETE /api/project-folders?id={id}` - Delete a folder

### Project Folder Items
- `POST /api/project-folders/items` - Add a project to a folder
- `DELETE /api/project-folders/items?folderId={id}&projectId={id}` - Remove a project from a folder

## Components

### 1. AddFolderButton
- Modal dialog for creating new folders
- Color picker for folder customization
- Form validation and error handling

### 2. ProjectFolderItem
- Displays individual folders with their contained projects
- Collapsible interface for project lists
- Edit and delete functionality
- Color-coded visual indicators

### 3. AddProjectToFolder
- Modal dialog for adding existing projects to folders
- Filters out folders that already contain the project
- Dropdown selection for folder choice

## Integration

### Sidebar Layout
The new feature is integrated into the existing project sidebar below the main projects section:

```
┌─────────────────────────┐
│ Projects                │
│ ├─ Project 1            │
│ ├─ Project 2            │
│ └─ Project 3            │
│                         │
│ Project Folders         │
│ ├─ 📁 Marketing         │
│ │   ├─ Project A        │
│ │   └─ Project B        │
│ └─ 📁 Personal          │
│     └─ Project C        │
└─────────────────────────┘
```

### State Management
- Uses React Query for server state management
- Local state for UI interactions (modals, form inputs)
- Optimistic updates for better user experience

## Usage

### Creating a Folder
1. Click "Create Folder" button in the sidebar
2. Enter folder name (required)
3. Optionally add description and choose color
4. Click "Create Folder"

### Adding Projects to Folders
1. Click the folder icon (📁) next to any project in the main projects list
2. Select a folder from the dropdown
3. Click "Add to Folder"

### Managing Folders
1. Click the three-dot menu (⋮) on any folder
2. Choose "Edit" to modify folder properties
3. Choose "Delete" to remove the folder (projects are preserved)

## Benefits

1. **Better Organization**: Users can group related projects together
2. **Improved Workflow**: Easier navigation between related projects
3. **Visual Clarity**: Color-coded folders for quick identification
4. **Flexibility**: Projects can be accessed from multiple locations
5. **Non-Destructive**: Deleting folders doesn't affect the actual projects

## Future Enhancements

1. **Nested Folders**: Support for sub-folders within folders
2. **Drag & Drop**: Visual drag-and-drop interface for organizing projects
3. **Folder Templates**: Pre-defined folder structures for common use cases
4. **Bulk Operations**: Add/remove multiple projects to/from folders at once
5. **Folder Sharing**: Share folders with team members
6. **Smart Folders**: Auto-organize projects based on tags or criteria

## Technical Notes

- Built with TypeScript for type safety
- Uses Prisma for database operations
- Implements proper error handling and user feedback
- Responsive design for mobile and desktop
- Follows existing code patterns and conventions
- No breaking changes to existing functionality
