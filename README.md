# 🎓 UNICAMP

UNICAMP is a modern, full-stack campus management and community platform designed to bridge the gap between students, administration, and campus life. It streamlines event management, professional networking, and student interactions through a sleek, unified interface.

## 🚀 Features

- **🛡️ Admin Portal**: Comprehensive dashboard for managing campus events, users, and platform settings.
- **📅 Event Management**: Discover, register, and track campus events with real-time updates.
- **💼 LinkedIn Integration**: AI-powered LinkedIn post generation (`generate-linkedin-post` Edge Function) to showcase campus activities professionally.
- **🛒 Campus Marketplace**: A dedicated space for students to list and discover items/services within the campus community.
- **👤 User Profiles**: Personalized profiles to manage registrations, listings, and campus identity.
- **🔐 Secure Authentication**: Integrated Supabase Auth for secure and easy access.
- **📱 Responsive Design**: Fully optimized for mobile, tablet, and desktop experiences.

## 🛠️ Tech Stack

- **Frontend**: 
  - [React](https://reactjs.org/) (Vite)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [shadcn/ui](https://ui.shadcn.com/)
  - [Framer Motion](https://www.framer.com/motion/) (Animations)
  - [TanStack Query](https://tanstack.com/query/latest) (Data Fetching)
- **Backend / Infrastructure**:
  - [Supabase](https://supabase.com/) (Database, Auth, Storage, Edge Functions)
  - [PostgreSQL](https://www.postgresql.org/)
- **State Management & Forms**:
  - [React Hook Form](https://react-hook-form.com/)
  - [Zod](https://zod.dev/) (Validation)

## 📂 Project Structure

```text
campus-karma-hub/
├── src/
│   ├── components/      # Reusable UI components (shadcn/ui + custom)
│   ├── contexts/        # React Contexts (Auth, etc.)
│   ├── hooks/           # Custom React hooks
│   ├── integrations/    # Supabase types and clients
│   ├── lib/             # Utility functions
│   └── pages/           # Application views (Home, Admin, Marketplace, Profile)
├── supabase/
│   ├── functions/       # Edge Functions (LinkedIn integration)
│   ├── migrations/      # SQL database migrations
│   └── seed.sql         # Initial data
├── scripts/             # Utility scripts (Admin creation, Email confirmation)
└── public/               # Static assets
```

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or Bun

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kushal-byte/CAMPUS-KARMA.git
   cd campus-karma-hub
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # OR
   bun install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 📦 Deployment

The project is configured for easy deployment via **Vercel** or **Netlify**.

1. Connect your GitHub repository to your preferred hosting provider.
2. Ensure Environment Variables are set in the provider's dashboard.
3. The build command is `npm run build`.

## 📜 License

This project is private and for internal campus use.

---

Built with ❤️ for the Campus Community.
