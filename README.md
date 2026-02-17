
# Keep It

Keep It is a clean and modern password manager web app with local-first storage, strong password generation, and easy account management.

<img width="1918" height="975" alt="image" src="https://github.com/user-attachments/assets/336842c4-819e-4954-af69-67007187f94f"/>

## Features

- Add, edit, and delete accounts (`url`, `username`, `password`)
- Password Manager view with quick card-based browsing
- Home dashboard with password generator
- Strong random password generation (16 chars)
- <img width="1810" height="232" alt="image" src="https://github.com/user-attachments/assets/b3d5b259-2f56-46fc-b1ce-5b6750ceedb4" />
- CSV export and import (`url,username,password`)
- Duplicate account prevention
- Clear all data flow with typed confirmation (`CLEAR DATA`)
- Site favicon + site name display from URL
- Responsive UI (desktop/mobile)


<img width="1919" height="973" alt="image" src="https://github.com/user-attachments/assets/7dff15a2-3a6c-4c58-a53a-d145ac07a8c0" />


## Tech Stack

- HTML5
- CSS3
- JavaScript
- Bootstrap 5
- Font Awesome

## Data & Security

- Data is stored in browser `localStorage`
- No backend, no cloud sync (currently)
- Clearing browser storage removes saved passwords

## Getting Started

1. Clone/download the project
2. Open `index.html` in your browser

## CSV Format

Header must be:

```csv
url,username,password
