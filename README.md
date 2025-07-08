# User Guide for the Website Application

This guide provides instructions on how to set up, use, and manage content for the website application.

## 1. Introduction

This is a Node.js web application built with Express. It serves static HTML content and dynamic page content managed through JSON files. It includes an administrative interface for content editing, page creation, and image management.

## 2. Setup

To get the application running, follow these steps:

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (Node Package Manager, usually comes with Node.js)

### Installation

1.  **Clone the repository (if applicable) or navigate to the project directory:**
    ```bash
    cd /path/to/your/website
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env` file in the root directory of the project (same level as `package.json`) and add the following environment variables. Replace the placeholder values with your desired secure credentials.

```
WEBSITE_ADMIN_TOKEN=your_secret_admin_token_here
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_admin_password
PORT=3010
```

*   `WEBSITE_ADMIN_TOKEN`: A secret token used for authenticating admin requests. Make this a strong, unique string.
*   `ADMIN_USERNAME`: The username for admin login.
*   `ADMIN_PASSWORD`: The password for admin login.
*   `PORT`: The port on which the server will run (e.g., `3010`). You can choose any available port.

### Starting the Server

Once the dependencies are installed and the `.env` file is configured, start the server:

```bash
npm start
```

The server will typically start on `http://localhost:3010` (or the port you specified in `.env`). You will see a message in your console indicating the server is running.

## 3. Basic Usage (Public Site)

After starting the server, open your web browser and navigate to `http://localhost:3010` (or your configured port).

*   **Navigation:** Use the navigation links (if present, typically loaded via `load-navbar.js`) to browse different sections of the website.
*   **Content Pages:** Pages like `services.html`, `about.html`, etc., will display content dynamically loaded from corresponding JSON files in the `content/` directory (e.g., `services.json`, `about.json`). If a JSON file doesn't exist for a given HTML page, it will display an empty content area.

## 4. Admin Features

The administrative interface allows you to manage the website's content.

### Admin Login

1.  Navigate to the admin login page: `http://localhost:3010/admin-login.html`
2.  Enter the `ADMIN_USERNAME` and `ADMIN_PASSWORD` you configured in your `.env` file.
3.  Upon successful login, an admin token will be stored in your browser's local storage, granting you access to editing features.

### Editing Existing Pages

1.  After logging in as an admin, navigate to any content page (e.g., `http://localhost:3010/services.html`).
2.  If you are logged in as an admin, an editor (powered by TinyMCE) will appear on the page, allowing you to modify the content.
3.  Make your desired changes in the editor.
4.  Click the "Save Content" button (if visible) to save your changes. The content will be saved to the corresponding JSON file in the `content/` directory.

### Creating New Pages

1.  As an admin, navigate to `http://localhost:3010/new-page.html`.
2.  An editor will appear. Enter the content for your new page.
3.  Click the "Save Content" button.
4.  You will be prompted to enter a page name. This name will be used to create the HTML file (e.g., `my-new-page.html`) and the corresponding JSON content file (e.g., `my-new-page.json`).
5.  The new page will also be automatically added to the `nav-items.json` file, making it appear in the website's navigation (if `nav-items.json` is used for navigation).

### Managing Images

The application supports uploading and deleting images through the admin interface.

*   **Uploading Images:** When editing a page, you can use the image upload feature within the TinyMCE editor. Images are uploaded to the `public/photos/` directory. Images uploaded via the editor are typically placed in a subfolder named `_editor`.
*   **Viewing Images:** You can view uploaded images by navigating to `http://localhost:3010/photo-gallery.html`. This page lists images grouped by their folders within `public/photos/`.
*   **Deleting Images:** The `photo-gallery.html` page also provides functionality for deleting images (admin access required).

### Downloading Content Customizations

When content, images, or audio files are modified directly on the deployed server via the admin interface, your local development environment's files can become out of sync. To synchronize your local codebase with the production content:

1.  **Log in as an Admin** on the deployed website.
2.  Navigate to any page that uses the admin editor (e.g., `http://localhost:3010/index.html`).
3.  Click the **"Download Content Backup"** button.
4.  A `content_backup.zip` file will be downloaded to your computer. This archive contains the latest versions of:
    *   `content/` (all JSON content files)
    *   `public/audio/` (all audio files)
    *   `public/photos/` (all image files)
5.  **Replace** the corresponding `content/`, `public/audio/`, and `public/photos/` directories in your local development environment with the contents of this downloaded zip file. This will bring your local files up to date with the server's customizations.

## 5. Troubleshooting

*   **Server not starting:**
    *   Check your `.env` file for missing or incorrect environment variables.
    *   Ensure no other application is using the specified `PORT`.
    *   Check the console for any error messages from `npm start`.
*   **Admin login issues:**
    *   Verify that `ADMIN_USERNAME` and `ADMIN_PASSWORD` in your `.env` file match what you are entering.
    *   Ensure your `WEBSITE_ADMIN_TOKEN` is set.
*   **Content not saving/loading:**
    *   Check the browser's developer console for any network errors or JavaScript errors.
    *   Ensure the server is running and accessible.
    *   Verify that the `content/` directory has appropriate write permissions for the Node.js process.
*   **Image upload issues:**
    *   Check server logs for errors related to `multer` or file system operations.
    *   Ensure the `public/photos/` directory has appropriate write permissions.

For further assistance, consult the `server.js` file for backend logic and the JavaScript files in `public/` for frontend behavior.
