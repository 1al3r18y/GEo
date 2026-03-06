# عالم الفخامة - Luxury World Georgia Travel Planner

> نظام تسعير وعروض أسعار وكالة السفر للرحلات إلى جورجيا

## 🌟 نظرة عامة

نظام متكامل لإدارة عروض أسعار رحلات السفر إلى جورجيا، يشمل:
- **إدارة عروض الفنادق** بـ 5 مستويات مختلفة
- **تسعير السيارات** بناءً على عدد الركاب
- **محرك توزيع الغرف الذكي** (Triple → Double → Single)
- **محرك حساب التكلفة الشامل** مع هامش الربح وتحويل العملات

## 📊 Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐     ┌──────────────────────┐                      │
│  │   system_settings    │     │  mandatory_services  │                      │
│  ├──────────────────────┤     ├──────────────────────┤                      │
│  │ id (PK)              │     │ id (PK)              │                      │
│  │ profit_margin (22%)  │     │ sim_card_price ($15) │                      │
│  │ exchange_rate (3.8)  │     │ insurance_price      │                      │
│  │ free_sim_cards (2)   │     └──────────────────────┘                      │
│  │ base_currency        │                                                    │
│  │ active_season        │                                                    │
│  └──────────────────────┘                                                    │
│                                                                              │
│  ┌──────────────────────┐     ┌──────────────────────┐                      │
│  │    hotel_offers      │     │    car_pricing       │                      │
│  ├──────────────────────┤     ├──────────────────────┤                      │
│  │ id (PK)              │     │ id (PK)              │                      │
│  │ offer_tier (1-5)     │     │ min_pax              │                      │
│  │ city                 │     │ max_pax              │                      │
│  │ hotel_name           │     │ price_per_day        │                      │
│  │ dbl_view             │     │ description_ar/en    │                      │
│  │ dbl_no_view          │     └──────────────────────┘                      │
│  │ trbl_view            │                                                    │
│  │ trbl_no_view         │     Car Pricing Tiers:                            │
│  └──────────────────────┘     • 1-3 pax:   $100/day                         │
│                                • 4-6 pax:   $120/day                         │
│  5 Offer Tiers:               • 7-8 pax:   $160/day                         │
│  • Tier 1: Economy            • 9-12 pax:  $250/day                         │
│  • Tier 2: Standard           • 13-24 pax: $550/day                         │
│  • Tier 3: Medium             • 25-45 pax: $700/day                         │
│  • Tier 4: Deluxe                                                            │
│  • Tier 5: Luxury                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🧮 خوارزمية توزيع الغرف الذكية

```
Effective Pax = Adults + Children > 6 years old

الأولوية:
1. غرف ثلاثية (Triple) أولاً
2. غرف مزدوجة (Double) ثانياً  
3. غرف مفردة (Single) فقط إذا لزم الأمر

مثال: 5 أشخاص فعليين = 1 ثلاثية + 1 مزدوجة = غرفتان
```

## 💰 معادلة حساب التكلفة

```
1. Hotel Cost = Σ(Room Price × Nights) per city
2. Car Cost = Daily Rate (based on total pax) × Days
3. SIM Cost = (Total Pax - 2 free) × $15 (if pax > 2)
4. Initial Cost = Hotel + Car + SIM
5. With Profit = Initial Cost × 1.22 (22% margin)
6. Final SAR = With Profit × 3.8 (exchange rate)
7. Rounded = round(Final ÷ 10) × 10
```

## 🚀 التشغيل

```bash
# تثبيت التبعيات
npm install

# تشغيل خادم التطوير
npm run dev

# تشغيل الاختبارات
npm test
```

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
