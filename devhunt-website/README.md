# DevHunt Static Website

This folder contains the complete static website for DevHunt, ready for deployment.

## 📁 Files Included

- **index.html** - Landing page with features, setup guide, and download links
- **docs.html** - Complete documentation with navigation and search
- **404.html** - Custom error page for missing pages
- **logo.png** - Transparent brand logo
- **logo-icon.png** - App icon
- **_redirects** - Netlify redirect configuration
- **netlify.toml** - Deployment settings and security headers

## 🚀 Deployment Instructions

### Option 1: Netlify (Recommended)

1. Go to [Netlify](https://app.netlify.com/)
2. Drag and drop this entire folder onto the Netlify dashboard
3. Done! Your site will be live in seconds

### Option 2: GitHub Pages

1. Create a new repository on GitHub
2. Upload all files to the repository
3. Go to Settings → Pages
4. Select "Deploy from branch" and choose `main` branch
5. Your site will be live at `https://username.github.io/repo-name`

### Option 3: Vercel

1. Go to [Vercel](https://vercel.com/)
2. Click "Add New" → "Project"
3. Import this folder
4. Deploy!

## ✨ Features

### Pages
- **Home Page**: Modern landing page with hero section, features grid, setup guide, and download links
- **Documentation**: Comprehensive docs with sidebar navigation, table of contents, and search functionality
- **404 Page**: Custom error page with helpful navigation

### Configuration
- **Redirects**: Common paths automatically redirect (e.g., `/home` → `/index.html`)
- **Security Headers**: X-Frame-Options, XSS Protection, Content-Type-Options
- **Cache Control**: Optimized caching for HTML, images, and static assets
- **SEO Ready**: Meta tags, OpenGraph tags, and semantic HTML

## 🎨 Theme

- **Colors**: Dark theme with accent green (#10b981)
- **Fonts**: Plus Jakarta Sans, JetBrains Mono
- **Style**: Modern, clean, with glassmorphism effects

## 🔗 Links

- **GitHub Repository**: https://github.com/hitehsolanki2006/DevHunt
- **Logo Assets**: Transparent PNG format

## 📝 Notes

- All paths use relative references (no absolute URLs)
- Logo path changed from `/logo.png` to `logo.png` for static hosting
- Return button changed from `href="/"` to `href="index.html"`
- No build process required - pure HTML/CSS/JavaScript

---

**Ready to deploy!** Just upload this folder to any static hosting provider.
