# 🔒 Security Guidelines

## ⚠️ Important Security Notice

This project requires sensitive API credentials that should **NEVER** be committed to version control.

### 🛡️ Credential Management

**✅ DO:**
- Create `.env` files locally based on `env.example`
- Store all API keys and secrets in environment variables
- Use the provided `.gitignore` to exclude `.env` files
- Rotate API keys regularly for production use

**❌ DON'T:**
- Commit real API keys to Git repositories
- Share `.env` files via email or messaging
- Hardcode credentials in source code
- Use development keys in production

### 🔑 Required Credentials

1. **Google OAuth 2.0**
   - `GOOGLE_CLIENT_ID` - From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

2. **Azure AI**
   - `AZURE_OPENAI_API_KEY` - From Azure AI Foundry
   - `AZURE_OPENAI_ENDPOINT` - Your Azure endpoint URL

3. **Application Security**
   - `JWT_SECRET` - Generate with `openssl rand -base64 32`
   - `ENCRYPTION_KEY` - Generate with `openssl rand -base64 44`

### 🚨 Security Checklist

- [ ] All `.env` files are in `.gitignore`
- [ ] No hardcoded credentials in source code
- [ ] Google OAuth has restricted redirect URIs
- [ ] Azure AI keys have appropriate access scopes
- [ ] JWT and encryption keys are randomly generated
- [ ] Test users are properly configured in Google OAuth

### 📞 Reporting Security Issues

If you discover a security vulnerability, please report it privately to the maintainers rather than opening a public issue.

---

**Remember: Security is everyone's responsibility!** 🛡️ 