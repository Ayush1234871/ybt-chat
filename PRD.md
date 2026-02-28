1. Project Overview
YBT Chat is a real-time messaging web and mobile application inspired by Telegram and WhatsApp. Built using React + Vite on the frontend, Supabase as the backend, and Capacitor for native Android packaging. Supports text messaging, image sharing, emoji, status updates, random chat, and rich UI customization. A separate admin panel provides analytics and user management.
PropertyValueApplication NameYBT ChatFrontend FrameworkReact + ViteMobile FrameworkCapacitor (Android)Backend / DatabaseSupabase (PostgreSQL + Realtime + Auth + Storage)DeploymentcPanel Hosting (Web) + APK (Android)Default Color ThemeSky Blue (#0EA5E9), White (#FFFFFF), Black (#0F172A)Admin Panel URLdomainname/1234/adminResponsive SupportMobile Web, Desktop Web, Android Native App

2. Technology Stack
2.1 Frontend
TechnologyPurpose / NotesReact 18 + ViteFast SPA development with HMR, optimized buildReact Router v6Client-side routing for all pages and admin panelZustandLightweight global state management (auth, theme, chat)TailwindCSSUtility-first styling, responsive design, dark modeshadcn/uiAccessible, unstyled components — buttons, dialogs, inputsFramer MotionSmooth animations and page transitionsEmoji MartEmoji picker component for chat and statusReact Hook Form + ZodForm handling with schema validationdate-fnsDate formatting and relative time (e.g. "2 mins ago")
MCP aleready connected, Project Name: YBT Chat
2.2 Backend — Supabase
Supabase ServiceUsagePostgreSQL DatabaseAll tables: users, messages, chats, statuses, etc.Supabase AuthEmail/password authentication with JWT sessionsSupabase RealtimeLive message delivery, online presence, status updatesSupabase StorageProfile pictures, chat images (with CDN URLs)Row Level Security (RLS)Per-user data access policies on all tablesEdge Functions (Deno)Admin-only operations (delete user, ban, analytics agg)Supabase Functions SchedulerAuto-expire statuses after 24 hours
2.3 Mobile — Capacitor
TechnologyDetailsCapacitor v5Native Android bridge for the React web app@capacitor/androidAndroid project scaffolding and native build@capacitor/status-barControl Android status bar color and visibility@capacitor/splash-screenCustom splash screen configuration@capacitor/push-notificationsFuture: FCM push notificationscapacitor-safe-areaRespects system UI insets (status bar, nav bar)Android StudioBuild and sign the APK for distribution
2.4 Admin Panel
TechnologyDetailsReact (same Vite project)Admin panel is a protected route inside the same appRechartsSimple charts for analytics (user growth, message count)Supabase Admin ClientService role key used only in Edge Functions (never client)Tailwind + minimal UIPlain functional UI, no advanced design required

3. Database Schema (Supabase / PostgreSQL)
3.1 users
ColumnTypeDescriptioniduuid (PK)References auth.users(id)full_nametextUser's full name entered at signupusernametext (UNIQUE)Chosen username, changeable every 5 daysemailtext (UNIQUE)User's email addressdate_of_birthdateRequired at signupgendertextmale / female / otheravatar_urltextSupabase Storage public URLis_privatebooleanProfile privacy: public = false, private = trueis_onlinebooleanReal-time presence flaglast_seentimestamptzLast activity timestampusername_changed_attimestamptzEnforce 5-day username change restrictiontheme_configjsonbUser's saved theme/customization preferencesis_bannedbooleanAdmin can ban usersstatustextactive / suspended / deletedcreated_attimestamptzAccount creation timestamp
3.2 chats
ColumnTypeDescriptioniduuid (PK)Unique chat identifiertypetextdirect / randomcreated_attimestamptzWhen chat was created
3.3 chat_participants
ColumnTypeDescriptioniduuid (PK)Row identifierchat_iduuid (FK)References chats(id)user_iduuid (FK)References users(id)joined_attimestamptzWhen the user joined this chat
3.4 messages
ColumnTypeDescriptioniduuid (PK)Unique message IDchat_iduuid (FK)References chats(id)sender_iduuid (FK)References users(id)typetexttext / image / emojicontenttextMessage text or emoji stringimage_urltextSupabase Storage URL (for images)is_readbooleanRead receipt flagcreated_attimestamptzTimestamp of message
3.5 statuses
ColumnTypeDescriptioniduuid (PK)Status IDuser_iduuid (FK)Author of the statuscontenttextText and/or emoji contentvisibilitytextcontacts / anyoneexpires_attimestamptzcreated_at + 24 hourscreated_attimestamptzStatus creation time
3.6 random_chat_sessions
ColumnTypeDescriptioniduuid (PK)Session IDchat_iduuid (FK)References chats(id) — the linked chat roomuser1_iduuid (FK)First connected useruser2_iduuid (FK)Second connected userconnected_attimestamptzWhen the pair connecteddisconnected_attimestamptzWhen either user disconnectedstatustextwaiting / connected / ended
3.7 admin_users
ColumnTypeDescriptioniduuid (PK)Admin IDemailtext (UNIQUE)Admin email (set once at first-time setup)password_hashtextBcrypt hashed passwordcreated_attimestamptzInitial setup timestamp

4. Authentication Flow
4.1 User Sign Up — Two-Step Flow
Step 1 collects core identity information. Step 2 allows username selection. On completion, the user is automatically redirected to the Home screen.
Step 1 — Identity Form

Full Name (required, min 2 chars)
Email (required, valid email format)
Date of Birth (required, date picker)
Gender (required, select: Male / Female / Other)
Password (required, min 8 chars, strength indicator)
Confirm Password (must match password field)

Step 2 — Username Selection

Username input (unique, alphanumeric + underscore, 3–20 chars)
Real-time availability check via Supabase query
On confirm: user profile created, session established
Redirect to Home page immediately

4.2 Sign In

Email + Password sign in via Supabase Auth
JWT session stored in localStorage (web) / SecureStorage (Capacitor)
Auto-redirect to Home if session is active on app launch
Forgot password: Supabase sends reset email with magic link

4.3 Admin Login

Admin accesses domainname/1234/admin
Admin email and password are set during first-time setup (one-time process)
After initial setup, credentials are fixed and cannot be changed from the UI
Admin session is separate from user sessions (different auth mechanism)


5. Application Layout & Navigation
5.1 Responsive Layout Strategy
ContextNavigation PatternMobile Web (< 768px)Bottom Navigation Bar with 4 tabsDesktop Web (≥ 768px)Left Sidebar with navigation links and user profileAndroid Native (Capacitor)Bottom Navigation Bar, full screen avoided
5.2 Navigation Sections
Tab / LinkDescriptionHome (Chat icon)All chats list + search barSearch (Search icon)User search + Random Chat feature at topStatus (Circle icon)View & post text/emoji statusesSettings (Gear icon)Profile, theme customization, privacy
5.3 Android Status Bar & Navigation Handling
The Capacitor app must NOT run in immersive/full-screen mode. The Android status bar and bottom navigation buttons must remain visible at all times.

Use @capacitor/status-bar to set style and background color
capacitor-safe-area plugin to respect system window insets
In AndroidManifest.xml: windowSoftInputMode = adjustResize (not fullScreen)
MainActivity.java: do NOT set FLAG_FULLSCREEN
Apply paddingTop = statusBarHeight in the app shell to prevent content overlap


6. Feature Specifications
6.1 Home Screen

Search bar at top — search contacts by name or username
Chats list: shows all existing direct message conversations
Each chat tile shows: avatar, username, last message preview, timestamp, unread count badge
Tap/click on any user to open the chat window
New chat: search for a user in Search section, then start conversation

6.2 Chat Window
FeatureDetailText MessagesSupports plain text with Enter-to-send (desktop) or Send button (mobile)Image SharingUpload from gallery/camera, stored in Supabase StorageEmoji SupportEmoji Mart picker integrated into message inputReal-time DeliverySupabase Realtime channel subscriptions for instant deliveryRead Receiptsis_read flag updated when recipient opens chatMessage TimestampsShown below each message bubbleFuture ExtensibilityMessage type column allows adding voice, video, documents later
6.3 Search Section

Search bar to find any user by username
Results show: avatar, name, username, online status
For public profiles: full details visible
For private profiles: only avatar, name, username visible
Click any result to start a direct chat

Random Chat Feature (top of Search section)

Button: "Start Random Chat" — opens dedicated screen
System searches for another user currently in the waiting pool (random_chat_sessions with status = waiting)
If a partner is found: session updated to connected, both users get a live chat room
If no partner is waiting: current user enters the waiting pool
Connected message shown to both: "Connected successfully, now chat"
Both users' usernames displayed at the top of the random chat screen
Supports: text messages and emojis only (no images)
Disconnect button: ends the session, chat archived, user can start a new session
Supabase Realtime used for matchmaking and message delivery

6.4 Status Section
FeatureDetailPost StatusText input + emoji picker, up to 500 charactersVisibilityChoice at posting time: "Contacts Only" or "Anyone (All Users)"24hr ExpirySupabase cron/scheduler or pg_cron to auto-delete expired statusesView StatusesSee statuses from contacts (and "Anyone" statuses from all users)Status CardShows author avatar, username, content, time postedMy StatusUser can view and delete their own active statuses
6.5 Settings Screen
Profile Management
SettingBehaviorProfile Picture (DP)Upload new photo → stored in Supabase Storage → avatar_url updatedFull NameEdit and save full nameUsernameChange allowed once every 5 days (username_changed_at enforced)
Theme & UI Customization
OptionDetailColor ThemePreset palettes (Sky Blue/default, Purple, Green, Rose, Orange)Custom ColorsAdvanced: pick primary and accent colors via color pickerDark / Light ModeToggle system-wide dark and light modeChat Bubble StyleRounded / Square / Compact optionsFont SizeSmall / Medium / Large text size preferenceBackground PatternNone / Subtle / Pattern options for chat backgrounds
All customizations are saved to theme_config (JSONB) in the users table and loaded on login.
Privacy Settings
SettingBehaviorPublic ProfileFull profile visible in search: avatar, name, username, bioPrivate ProfileOnly avatar, name, username visible in search resultsToggleSwitch in Privacy Settings tab — updates is_private in users table

7. Admin Panel
7.1 Access & Security

URL: domainname/1234/admin — obscure path for security through obscurity
React Router protected route: if not admin-authenticated, redirect to admin login
First-time setup: if admin_users table is empty, show first-time registration form
After setup, credentials are fixed — no UI to change them (must be done via DB directly)
Admin session token stored in sessionStorage (clears on browser close)
Admin auth is separate from Supabase user auth — uses its own table

7.2 Admin Dashboard — Analytics
Metric / WidgetDescriptionTotal UsersCount of all registered users in the users tableActive Users (7d)Users with last_seen within the last 7 daysNew Registrations (30d)Line chart: user sign-ups over the past 30 daysTotal Messages SentTotal count from messages tableMessages TodayCount of messages created todayActive ChatsCount of chats with messages in last 24 hoursActive StatusesCount of non-expired status posts currently liveBanned UsersCount of users with is_banned = true
7.3 User Management
ActionImplementationList All UsersPaginated table: username, email, join date, status, ban flagSearch UsersFilter by username or emailView User DetailsModal: full profile, message count, last activeEdit UserChange: full_name, username, email, is_private, statusBan / Unban UserToggle is_banned flag; banned users cannot log inDelete UserSoft delete: set status = deleted, anonymize dataStatus ManagementChange user status: active / suspended / deleted
7.4 Admin UI Principles

Plain, functional UI — no animations or complex design
White background, black text, sky blue for action buttons
Standard HTML-like table for user listings
Simple bar/line charts using Recharts for analytics
Mobile responsive but primarily optimized for desktop use


8. Project File Structure
ybt-chat/
├── android/                    (Capacitor Android project)
├── public/                     (static assets, favicon, icons)
├── src/
│   ├── assets/                 (images, fonts)
│   ├── components/             (shared reusable UI components)
│   │   ├── ui/                 (shadcn/ui base components)
│   │   ├── chat/               (MessageBubble, ChatInput, ChatHeader)
│   │   ├── status/             (StatusCard, StatusComposer)
│   │   └── layout/             (Sidebar, BottomNav, AppShell)
│   ├── pages/
│   │   ├── auth/               (SignIn, SignUp Step1, SignUp Step2)
│   │   ├── home/               (Home, ChatWindow)
│   │   ├── search/             (Search, RandomChat)
│   │   ├── status/             (StatusFeed, PostStatus)
│   │   ├── settings/           (Profile, Theme, Privacy)
│   │   └── admin/              (AdminLogin, Dashboard, UserMgmt)
│   ├── store/                  (Zustand stores: auth, chat, theme)
│   ├── lib/
│   │   ├── supabase.js         (Supabase client init)
│   │   ├── supabase-admin.js   (Admin edge function callers)
│   │   └── utils.js            (helpers, date, formatters)
│   ├── hooks/                  (useAuth, useMessages, usePresence)
│   ├── App.jsx                 (Router + protected routes)
│   └── main.jsx                (Vite entry point)
├── capacitor.config.ts
├── vite.config.js
├── tailwind.config.js
└── package.json

9. Supabase Configuration
9.1 Row Level Security (RLS) Policies
TableRLS Rule SummaryusersUsers can only read/update their own row; public profiles readable by all authenticated usersmessagesOnly participants of the chat_id can read/insert messageschats / chat_participantsOnly participants can view their chats; system creates new chatsstatusesvisibility=anyone → all auth users; visibility=contacts → only shared-chat usersrandom_chat_sessionsOnly the matched users can read their session; Edge Function creates sessionsadmin_usersNo client-side access; only accessible via service role in Edge Functions
9.2 Realtime Channels
ChannelPurposechat:{chat_id}Live message delivery within a specific chat roompresence:globalOnline/offline status of users across the apprandom_chat:queueRandom chat matchmaking — detect when a partner joinsstatus:updatesLive status post creation broadcast
9.3 Storage Buckets
BucketContents / PolicyavatarsProfile pictures; public read, auth-only write; max 5MB, image/* onlychat-imagesImages sent in chats; private read (participants only), auth write; max 20MB

10. Capacitor Android Configuration
10.1 capacitor.config.ts
typescriptimport { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ybtchat.app',
  appName: 'YBT Chat',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: {
    backgroundColor: '#FFFFFF',
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#0284C7',
      overlaysWebView: false,   // STATUS BAR DOES NOT OVERLAY CONTENT
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0EA5E9',
      androidSplashResourceName: 'splash',
    },
  },
};

export default config;
10.2 Android Build Commands
CommandDescriptionnpm run buildBuild the React app to /distnpx cap copy androidCopy /dist into the Android projectnpx cap syncSync Capacitor plugins and update native projectnpx cap open androidOpen project in Android StudioBuild > Generate Signed APKIn Android Studio: create release APK for distribution

11. cPanel Deployment Guide
11.1 Build & Upload

Run npm run build — generates /dist folder
Upload all files from /dist to public_html via cPanel File Manager or FTP
The app is a Single Page Application (SPA) — requires .htaccess configuration

11.2 .htaccess for SPA Routing
apache<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
11.3 Environment Variables

Supabase keys must be set as Vite env variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
These are public-safe values — never use the service role key on the client
For cPanel: embed the vars in the build before uploading, or use a build script
Admin-only operations use Supabase Edge Functions (which hold the service role key securely)


12. Development Roadmap (Phases)
PhaseMilestoneKey DeliverablesPhase 1FoundationSupabase project setup, DB schema, RLS policies, Vite + Tailwind boilerplate, auth pagesPhase 2Core ChatHome screen, chat list, chat window, real-time messaging, image upload, emoji pickerPhase 3Search & RandomUser search, public/private profiles, random chat matchmaking with RealtimePhase 4StatusStatus composer, visibility options, status feed, 24-hour expiry cron jobPhase 5Settings & ThemeProfile edit, username cooldown, theme customization, dark mode, privacy togglePhase 6Admin PanelAdmin login, first-time setup, analytics dashboard, user management (CRUD + ban)Phase 7Capacitor AndroidCapacitor setup, status bar config, safe area handling, APK build and testPhase 8cPanel DeployProduction build, .htaccess, upload to cPanel, end-to-end testingPhase 9Polish & QACross-browser testing, mobile testing, performance audit, bug fixes

13. Key Technical Decisions & Notes
DecisionRationaleNo full-screen on AndroidSTATUS BAR and navigation must always be visible; overlaysWebView = false + capacitor-safe-area enforces thisAdmin at /1234/adminObscure path reduces exposure; protected route with separate auth tokenFixed admin credentialsSet once at first-time setup, never changeable via UI — security by designZustand over ReduxSimpler API, less boilerplate, sufficient for this app's state complexitySupabase RealtimeBuilt into Supabase, no extra WebSocket server needed; channels per chat_idUsername 5-day cooldownusername_changed_at column checked client and server side before allowing changeJSONB for theme_configFlexible schema — add new theme options without DB migrationsEdge Functions for admin opsKeeps service role key server-side; client never has elevated permissionsSoft delete for usersstatus = deleted preserves message history integrity; data is anonymizedpg_cron for status expirySupabase supports pg_cron extension — runs DELETE WHERE expires_at < NOW()

14. Security Checklist

RLS enabled on all tables in Supabase
Service role key only used in Edge Functions (never exposed to client)
Admin route protected by separate auth check, not user JWT
File upload validation: type and size limits enforced in Supabase Storage policies
Input sanitization: Zod schema validation on all form inputs
CORS: Supabase project URL allowlist configured for production domain
HTTPS enforced on cPanel (SSL certificate required)
Banned users: login rejected at auth level (checked via is_banned flag in DB trigger)
Admin credentials: bcrypt hashed password stored in admin_users table