# Streamlogics Website

Your Streamlogics website is live! 🎉

## Estructura
- `src/pages/index.astro` - la portada (Astro + GSAP)
- `src/i18n.js` - textos en en/es/pt/fr
- `public/` - pedido, paginas legales, favicons y `CNAME`, se copian tal cual
- `.github/workflows/deploy.yml` - construye y publica en GitHub Pages en cada push a `main`

Para probar en local: `npm install` y luego `npm run dev`.

## Next Steps

### 1. Enable GitHub Pages
1. Go to your repository **Settings**
2. Scroll to **Pages** section
3. Set Source to **GitHub Actions**

### 2. Configure Your Domain
1. Go to your domain provider (GoDaddy, Namecheap, etc.)
2. Update DNS records:

**For www subdomain:**
- Type: CNAME
- Name: www
- Value: alejandroarguellosanabria-dotcom.github.io

**For root domain (streamlogicsweb.com):**
- Type: A records (add all 4):
  - 185.199.108.153
  - 185.199.109.153
  - 185.199.110.153
  - 185.199.111.153

### 3. Verify SSL Certificate
- GitHub Pages will automatically provision an SSL certificate (HTTPS)
- This may take a few minutes to appear

## Your Website Features
✅ Fully responsive design
✅ Beautiful hero section with pricing
✅ Smooth animations
✅ Mobile-optimized
✅ Ready for GitHub Pages deployment

## Need Help?
For GitHub Pages setup: https://docs.github.com/en/pages
For domain configuration: Contact your domain provider's support