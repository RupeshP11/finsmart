# FinSmart - Personal Finance Management Application

A comprehensive fintech application for tracking income, expenses, budgets, investments, and financial goals. Built with React, FastAPI, and PostgreSQL.

## Project Links

- **Live Application**: https://finsmart-seven.vercel.app
- **Backend API**: https://finsmart-backend-bp85.onrender.com
- **GitHub Repository**: https://github.com/RupeshP11/finsmart

## Technology Stack

### Frontend
- React 18.2.0
- Vite (build tool)
- React Router DOM
- Recharts (data visualization)
- Deployed on Vercel

### Backend
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- PostgreSQL (via Supabase)
- Deployed on Render
- yfinance (stock market data)

### Database
- Supabase (PostgreSQL)

## Features

1. **Dashboard**: Overview of financial summary and alerts
2. **Transactions**: Track and categorize income and expenses
3. **Analytics**: Visualize spending patterns and trends
4. **Budget Management**: Set and monitor budget limits
5. **Savings Goals**: Create and track savings targets
6. **Investment Advisor**: AI-powered investment recommendations
7. **SIP Calculator**: Systematic Investment Plan calculator
8. **Auto Savings**: Automatic savings rules
9. **Market Ticker**: Live stock price updates (updates every 30 seconds)
10. **AI Chat**: AI-powered financial insights and queries

## Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL (via Supabase)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend will run on: http://127.0.0.1:8000

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on: http://localhost:5173

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@host/database
ALLOWED_ORIGINS=https://finsmart-seven.vercel.app,http://localhost:5173
```

### Frontend (.env.local)
```
VITE_API_BASE_URL=https://finsmart-backend-bp85.onrender.com
```

## API Endpoints

### Authentication
- POST /auth/register - Register new user
- POST /auth/login - Login user
- POST /auth/logout - Logout user

### Transactions
- GET /transactions - Get all transactions
- POST /transactions - Create transaction
- PUT /transactions/{id} - Update transaction
- DELETE /transactions/{id} - Delete transaction

### Analytics
- GET /analytics/summary - Get monthly summary
- GET /analytics/yearly - Get yearly data

### Markets
- GET /markets/ticker - Get live stock prices

### Budget
- GET /budget - Get budgets
- POST /budget - Create budget
- PUT /budget/{id} - Update budget

### Insights
- GET /insights - Get financial insights

## Recent Updates (February 13, 2026)

### Live Stock Ticker
- Refresh rate improved to 30 seconds (from 60 seconds)
- Backend cache optimized to 20 seconds for fresher data
- Enhanced error handling with yfinance timeout management
- Multiple fallback sources for data reliability

### Mobile Optimization
- Responsive design for all screen sizes (320px to 1440px)
- 5 optimized breakpoints for perfect display
- Touch-friendly buttons and controls (44px minimum per WCAG)
- Input fields sized at 16px to prevent automatic zoom
- Optimized ticker tape for mobile devices

### Production Configuration
- CORS headers configured for Vercel frontend
- Environment-based API URL detection
- Improved error handling and graceful degradation
- Thread-safe caching mechanisms

## File Structure

```
FinSmart/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── core/
│   │   ├── ml/
│   │   └── seed_categories.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── config.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── CHANGES_SUMMARY.md
├── DEPLOYMENT_VERIFICATION.md
├── PERFORMANCE_GUIDE.md
├── TESTING_CHECKLIST.md
└── README.md
```

## Documentation

- **CHANGES_SUMMARY.md**: Detailed technical changes and improvements
- **DEPLOYMENT_VERIFICATION.md**: Step-by-step deployment and testing guide
- **PERFORMANCE_GUIDE.md**: Performance optimization tips and best practices
- **TESTING_CHECKLIST.md**: Quality assurance test cases

## Deployment

### Vercel (Frontend)
1. Connect GitHub repository to Vercel
2. Set environment variable: VITE_API_BASE_URL=https://finsmart-backend-bp85.onrender.com
3. Deploy on git push

### Render (Backend)
1. Connect GitHub repository to Render
2. Set environment variables for database connection
3. Set ALLOWED_ORIGINS for CORS
4. Deploy on git push

### Supabase (Database)
1. Create PostgreSQL database on Supabase
2. Connection string available in dashboard
3. Automatically synced with backend deployment

## Testing

### Test Coverage
- Desktop browsers: Chrome, Firefox, Safari
- Mobile browsers: iOS Safari, Android Chrome
- Screen sizes: 320px to 1920px
- API endpoints: All major routes
- Load time: Under 3 seconds
- Ticker update: Every 30 seconds

## Performance

- Page load time: Less than 3 seconds
- Ticker refresh: Every 30 seconds
- API response: Under 500ms
- Cache hit rate: High (20-second server cache)

## Troubleshooting

### Ticker shows old data
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check network tab for API errors

### API connection issues
- Verify VITE_API_BASE_URL is correct
- Check Render backend is running
- Verify database connection

### Mobile layout issues
- Clear browser cache
- Test in incognito/private mode
- Check viewport meta tag

## Git Workflow

All changes are tracked in version control:

```bash
# Latest changes
git log --oneline -5

# View specific commit
git show [commit-hash]

# Pull latest
git pull origin main
```

## Future Enhancements

1. WebSocket for real-time ticker updates
2. International stock exchange support
3. Premium market data API integration
4. Offline mode with service workers
5. Advanced caching strategies
6. Mobile app (React Native)
7. Voice-based transaction entry
8. More AI-powered insights

## Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Create pull request
5. Review and merge

## License

This project is private and proprietary.

## Support

For issues or questions:
1. Check the documentation files
2. Review browser console (F12)
3. Check Render logs for backend errors
4. Review Vercel deployment logs

## Changelog

### Version 1.0.0 (February 13, 2026)
- Initial production release
- Live stock ticker with 30-second refresh
- Comprehensive mobile optimization
- Full financial management suite
- AI-powered insights
- Production-ready deployment

---

Last Updated: February 13, 2026
Status: Production Ready
