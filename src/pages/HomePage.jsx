import { useState } from 'react';
import {
  Egg,
  Bird,
  LayoutDashboard,
  Layers,
  Wheat,
  Pill,
  Syringe,
  Boxes,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Activity,
  ArrowRight,
  Menu,
  X,
  Lock,
} from 'lucide-react';
import { APP_INFO } from '../utils/constants.js';
import styles from './HomePage.module.css';

// Exact generated visual asset path
const HERO_IMAGE_PATH = '/src/assets/images/poultry_farm_hero_1793700199566.jpg';

export function HomePage({ onLogin, onGetStarted }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Feature cards data: 9 modules (6 operational + 3 roadmap)
  const features = [
    {
      id: 'dashboard',
      title: 'Farm Command Center',
      status: 'Operational',
      isOperational: true,
      icon: LayoutDashboard,
      description: 'Unified real-time dashboard consolidating live flock census, active medication withdrawal periods, upcoming vaccination reminders, and critical feed stock alerts.',
      capabilities: [
        'Live flock headcount & mortality rate summary',
        'Imminent vaccination due-date alerts',
        'Active pharmaceutical withdrawal warnings',
        'Grain & pellet stock replenishment indicators',
      ],
    },
    {
      id: 'birds',
      title: 'Individual Bird Registry',
      status: 'Operational',
      isOperational: true,
      icon: Bird,
      description: 'Granular tracking of valuable breeding stock, pedigree lineage, physical traits, leg bands, and lifetime health treatments.',
      capabilities: [
        'Unique monotonic tag & band indexing',
        'Sire & dam pedigree genealogy records',
        'Individual health & vaccination logs',
        'Breed-specific growth & weight performance',
      ],
    },
    {
      id: 'batches',
      title: 'Batch & Pen Housing',
      status: 'Operational',
      isOperational: true,
      icon: Layers,
      description: 'Flock cohort management from day-old chick arrival to final harvest, paired with strict pen capacity density enforcement.',
      capabilities: [
        'Brooding to finisher flock stage progression',
        'Pen capacity limits preventing flock overcrowding',
        'Inter-pen batch transfers with audit logs',
        'Automatic living population balance recalculations',
      ],
    },
    {
      id: 'feed',
      title: 'Feed Inventory & Rationing',
      status: 'Operational',
      isOperational: true,
      icon: Wheat,
      description: 'End-to-end feed tracking covering mill purchases, formula varieties, stock levels, bag weights, and automated daily consumption decrements.',
      capabilities: [
        'Starter, grower, finisher & layer formulas',
        'Purchase orders with supplier tracking',
        'Atomic stock updates on daily feeding logs',
        'Low-stock threshold alerts preventing outages',
      ],
    },
    {
      id: 'medication',
      title: 'Medication & Withdrawal Tracking',
      status: 'Operational',
      isOperational: true,
      icon: Pill,
      description: 'Veterinary pharmaceutical administration with strict mandatory withdrawal period countdowns safeguarding food safety and flock health.',
      capabilities: [
        'Antibiotic, antiparasitic & vitamin catalog',
        'Mandatory withdrawal period calculation in days',
        'Live bio-security warning banners on active withdrawal',
        'Per-batch & per-bird administration audit trail',
      ],
    },
    {
      id: 'vaccination',
      title: 'Vaccination & Cold Chain',
      status: 'Operational',
      isOperational: true,
      icon: Syringe,
      description: 'Automated immunisation scheduling calculated from true batch hatch age, biosecurity expiration enforcement, and cold chain temperature monitoring.',
      capabilities: [
        'Marek, Newcastle, Gumboro & Fowl Pox schedules',
        'Accurate hatch-date age reference calculations',
        'Strict biosecurity block on expired vials',
        'Cold-chain storage instruction compliance checks',
      ],
    },
    {
      id: 'eggs',
      title: 'Egg Production & Grading',
      status: 'Operational',
      isOperational: true,
      icon: Egg,
      description: 'Comprehensive daily collection logging, automated Hen-Day Production (HDP) curves, and quality sorting from Grade A to rejects.',
      capabilities: [
        'Hen-Day Production (HDP) rate curves',
        'Clean, cracked, and soiled sorting breakdown',
        'Crate and tray inventory integration',
        'Peak laying curve comparison benchmarks',
      ],
    },
    {
      id: 'mortality',
      title: 'Mortality Tracking & Biosecurity',
      status: 'Roadmap',
      isOperational: false,
      icon: Activity,
      description: 'Accurate mortality logs, suspected autopsy findings, sudden spike warnings, and bio-secure disposal protocol documentation.',
      capabilities: [
        'Daily mortality rate calculation per batch',
        'Abnormal mortality surge alert thresholds',
        'Post-mortem condition diagnosis recording',
        'Sanitary carcass disposal audit logs',
      ],
    },
    {
      id: 'sales',
      title: 'Farm Sales & Operational Ledgers',
      status: 'Roadmap',
      isOperational: false,
      icon: ShoppingBag,
      description: 'Point-of-sale logging for live broilers, spent hens, crates of table eggs, and organic fertilizer with payment term ledgers.',
      capabilities: [
        'Live bird weight pricing & crate invoicing',
        'Wholesale vs retail customer ledger tracking',
        'Revenue streams vs operational feed costs',
        'Offline financial summaries & exportable receipts',
      ],
    },
  ];

  // 5 Foundational Benefits (Strictly no claims of cloud backup)
  const benefits = [
    {
      index: '01',
      title: 'Organized Farm Records',
      subtitle: 'Centralized Master Ledger',
      description: 'Replaces lost clipboards and paper slips with immutable, structured records for flock cohorts, individual pedigree birds, feed mill invoices, and medical regimens.',
    },
    {
      index: '02',
      title: 'Better Stock Monitoring',
      subtitle: 'Crowding & Headcount Control',
      description: 'Enforces square-meter bird density guidelines across pens and houses. Prevents overstocking while maintaining an exact, living census after mortality and transfers.',
    },
    {
      index: '03',
      title: 'Vaccination & Treatment Tracking',
      subtitle: 'Biosecurity & Food Safety',
      description: 'Calculates immunisation dates based on true flock hatch age. Automatically enforces pharmaceutical withdrawal periods before eggs or meat are released.',
    },
    {
      index: '04',
      title: 'Farm Performance Insights',
      subtitle: 'Data-Driven Decision Making',
      description: 'Reveals true operational indicators: feed conversion patterns, batch survival percentages, inventory valuations in local currency, and treatment histories.',
    },
    {
      index: '05',
      title: 'Offline-First Farm Management',
      subtitle: 'Zero Cloud Latency · Zero Internet Dependency',
      description: 'Engineered specifically for agricultural environments where internet is intermittent. All farm data resides privately and securely inside your device\'s local IndexedDB.',
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      {/* ====================================================================
          1. NAVIGATION BAR (Top Bar Contract: 3 Zones)
          ==================================================================== */}
      <header className={styles.navbar}>
        {/* Zone 1: Wordmark with Logo */}
        <a href="#hero" onClick={(e) => handleNavClick(e, 'hero')} className={styles.brandLink}>
          <div className={styles.brandLogoBox}>
            <Egg size={22} className={styles.brandEgg} />
            <Bird size={14} className={styles.brandBird} />
          </div>
          <div className={styles.brandTextGroup}>
            <span className={styles.brandName}>{APP_INFO.name}</span>
            <span className={styles.brandTagline}>{APP_INFO.tagline}</span>
          </div>
        </a>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav className={styles.navLinks} aria-label="Main Navigation">
          <a href="#hero" onClick={(e) => handleNavClick(e, 'hero')} className={styles.navLink}>
            Home
          </a>
          <a href="#features" onClick={(e) => handleNavClick(e, 'features')} className={styles.navLink}>
            Features
          </a>
          <a href="#about" onClick={(e) => handleNavClick(e, 'about')} className={styles.navLink}>
            About
          </a>
          <a href="#benefits" onClick={(e) => handleNavClick(e, 'benefits')} className={styles.navLink}>
            Benefits
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className={styles.navActions}>
          <button
            type="button"
            onClick={onLogin}
            className={styles.primaryNavBtn}
          >
            <Lock size={15} />
            <span>Admin Console</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={styles.mobileMenuBtn}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawer}>
          <ul className={styles.mobileDrawerLinks}>
            <li>
              <a href="#hero" onClick={(e) => handleNavClick(e, 'hero')} className={styles.mobileDrawerLink}>
                Home
              </a>
            </li>
            <li>
              <a href="#features" onClick={(e) => handleNavClick(e, 'features')} className={styles.mobileDrawerLink}>
                Features & Modules
              </a>
            </li>
            <li>
              <a href="#about" onClick={(e) => handleNavClick(e, 'about')} className={styles.mobileDrawerLink}>
                About FreshNest
              </a>
            </li>
            <li>
              <a href="#benefits" onClick={(e) => handleNavClick(e, 'benefits')} className={styles.mobileDrawerLink}>
                Farm Benefits
              </a>
            </li>
          </ul>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onLogin();
            }}
            className={styles.primaryNavBtn}
            style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
          >
            <Lock size={16} />
            <span>Sign In to Farm Console</span>
          </button>
        </div>
      )}

      {/* ====================================================================
          2. HERO SECTION
          ==================================================================== */}
      <section id="hero" className={styles.heroSection}>
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <span className={styles.heroKicker}>Precision Poultry Stewardship</span>
            <h1 className={styles.heroHeadline}>
              Smarter Poultry Farming Starts Here.
            </h1>
            <p className={styles.heroSupportingText}>
              A dedicated offline-first workstation unifying flock batch lifecycles, pen housing density, feed ration tracking, veterinary medication withdrawal periods, and automated immunisation schedules in one private farm console.
            </p>

            <div className={styles.heroCtaGroup}>
              <button
                type="button"
                onClick={onGetStarted}
                className={styles.heroPrimaryBtn}
              >
                <span>Get Started</span>
                <ArrowRight size={17} />
              </button>

              <a
                href="#features"
                onClick={(e) => handleNavClick(e, 'features')}
                className={styles.heroSecondaryBtn}
              >
                <span>Explore Features</span>
              </a>
            </div>
          </div>

          {/* Hero Visual Media Carrier with Zero-Broken-Image Policy */}
          <div className={styles.heroMediaWrapper}>
            {!imageError ? (
              <img
                src={HERO_IMAGE_PATH}
                alt="FreshNest clean organic poultry barn and pasture with healthy hens"
                referrerPolicy="no-referrer"
                className={styles.heroImage}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className={styles.heroFallbackContainer}>
                <div className={styles.fallbackIconBox}>
                  <Egg size={36} />
                </div>
                <h3 className={styles.fallbackTitle}>{APP_INFO.name}</h3>
                <p className={styles.fallbackSubtext}>
                  Professional offline-first poultry management workstation
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Real Trust / Metric Strip */}
        <div className={styles.trustStrip}>
          <div className={styles.trustItem}>
            <div className={styles.trustIconBox}>
              <HardDrive size={18} />
            </div>
            <div className={styles.trustTextGroup}>
              <span className={styles.trustTitle}>Offline-First Native</span>
              <span className={styles.trustSubtitle}>Private IndexedDB Storage</span>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIconBox}>
              <CheckCircle2 size={18} />
            </div>
            <div className={styles.trustTextGroup}>
              <span className={styles.trustTitle}>7 Active Modules</span>
              <span className={styles.trustSubtitle}>Flock, Pen, Feed & Health</span>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIconBox}>
              <ShieldCheck size={18} />
            </div>
            <div className={styles.trustTextGroup}>
              <span className={styles.trustTitle}>Biosecurity Enforced</span>
              <span className={styles.trustSubtitle}>Withdrawal & Expiry Blocks</span>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIconBox}>
              <Boxes size={18} />
            </div>
            <div className={styles.trustTextGroup}>
              <span className={styles.trustTitle}>Zero Cloud Reliance</span>
              <span className={styles.trustSubtitle}>100% On-Premise Operation</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. FEATURES SECTION (Bento Grid of Modules)
          ==================================================================== */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionKicker}>Comprehensive Farm Capabilities</span>
          <h2 className={styles.sectionTitle}>
            Engineered for Complete Farm Stewardship
          </h2>
          <p className={styles.sectionDescription}>
            Every module in FreshNest is tailored to real poultry operations — eliminating guesswork, preventing flock overcrowding, and maintaining biosecurity compliance.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className={`${styles.featureCard} ${!feature.isOperational ? styles.featureCardUpcoming : ''}`}
              >
                <div className={styles.featureCardHeader}>
                  <div className={styles.featureIconBox}>
                    <Icon size={22} />
                  </div>
                  <span
                    className={`${styles.statusIndicator} ${
                      feature.isOperational ? styles.statusOperational : styles.statusPlanned
                    }`}
                  >
                    {feature.isOperational ? '● Operational' : '○ Planned'}
                  </span>
                </div>

                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.description}</p>

                <ul className={styles.featureCapabilitiesList}>
                  {feature.capabilities.map((cap, idx) => (
                    <li key={idx} className={styles.featureCapItem}>
                      <span className={styles.featureCapBullet} />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ====================================================================
          4. ABOUT SECTION
          ==================================================================== */}
      <section id="about" className={styles.aboutSection}>
        <div className={styles.aboutGrid}>
          <div className={styles.aboutContent}>
            <span className={styles.sectionKicker}>Farm Architecture & Vision</span>
            <h2 className={styles.sectionTitle}>
              Everything Your Poultry Farm Needs in One System.
            </h2>
            <p className={styles.aboutParagraph}>
              Poultry farming demands continuous precision. A missed Newcastle booster, an uncalculated overcrowding condition in Pen 3, or premature egg sales during an active antibiotic withdrawal can cause heavy financial loss and biosecurity violations.
            </p>
            <p className={styles.aboutParagraph}>
              FreshNest replaces fragmented record-keeping with a resilient workstation engineered specifically for the physical conditions of modern poultry barns — where stable internet connection cannot be taken for granted.
            </p>

            <div className={styles.aboutHighlights}>
              <div className={styles.aboutHighlightCard}>
                <span className={styles.aboutHighlightTitle}>True Hatch Age Schedules</span>
                <span className={styles.aboutHighlightDesc}>Vaccine dates calculated from actual chick age, not mere arrival days.</span>
              </div>
              <div className={styles.aboutHighlightCard}>
                <span className={styles.aboutHighlightTitle}>Strict Pen Density Guards</span>
                <span className={styles.aboutHighlightDesc}>Rejects transfers that breach predefined square-meter capacity limits.</span>
              </div>
            </div>
          </div>

          <div className={styles.aboutShowcaseBox}>
            <div className={styles.showcaseBadgeGroup}>
              <ShieldCheck size={18} />
              <span>Bio-Security Guarantee</span>
            </div>
            <h3 className={styles.showcaseHeading}>
              Designed for Rigorous Regulatory & Health Standards
            </h3>
            <div className={styles.showcasePoints}>
              <div className={styles.showcasePoint}>
                <CheckCircle2 size={16} className={styles.showcaseCheckIcon} />
                <span>Zero-cloud dependency ensures records remain available during network outages.</span>
              </div>
              <div className={styles.showcasePoint}>
                <CheckCircle2 size={16} className={styles.showcaseCheckIcon} />
                <span>Automatic expiry locks prevent the accidental administration of expired vaccines or drugs.</span>
              </div>
              <div className={styles.showcasePoint}>
                <CheckCircle2 size={16} className={styles.showcaseCheckIcon} />
                <span>PBKDF2-SHA256 authenticated administrative access secures proprietary farm records.</span>
              </div>
              <div className={styles.showcasePoint}>
                <CheckCircle2 size={16} className={styles.showcaseCheckIcon} />
                <span>Immutable audit logs preserve full traceability across batches, feeds, and medical histories.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. BENEFITS SECTION (5 Foundational Pillars)
          ==================================================================== */}
      <section id="benefits" className={styles.benefitsSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionKicker}>Measurable Farm Outcomes</span>
          <h2 className={styles.sectionTitle}>
            Why Modern Poultry Producers Choose FreshNest
          </h2>
          <p className={styles.sectionDescription}>
            Built around five foundational operational pillars to improve flock survivability, reduce feed waste, and elevate farm profitability.
          </p>
        </div>

        <div className={styles.benefitsList}>
          {benefits.map((benefit) => (
            <div key={benefit.index} className={styles.benefitRow}>
              <div className={styles.benefitIndex}>{benefit.index}</div>
              <div className={styles.benefitHeadingGroup}>
                <h3 className={styles.benefitTitle}>{benefit.title}</h3>
                <span className={styles.benefitSubtitle}>{benefit.subtitle}</span>
              </div>
              <p className={styles.benefitDescription}>{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          6. CALL TO ACTION BANNER
          ==================================================================== */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaHeadline}>
            Take Control of Your Poultry Farm.
          </h2>
          <p className={styles.ctaSupporting}>
            Launch your local FreshNest console now to organize batches, verify pen capacities, manage feed inventory, and maintain pristine flock health records.
          </p>
          <button
            type="button"
            onClick={onGetStarted}
            className={styles.ctaButton}
          >
            <span>Login to Your Farm Dashboard</span>
            <ArrowRight size={17} />
          </button>
          <span className={styles.ctaSubtext}>
            Runs 100% locally in your browser · No external accounts or cloud subscriptions required
          </span>
        </div>
      </section>

      {/* ====================================================================
          7. FOOTER
          ==================================================================== */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrandGroup}>
              <div className={styles.brandLink}>
                <div className={styles.brandLogoBox} style={{ width: 34, height: 34 }}>
                  <Egg size={18} className={styles.brandEgg} />
                  <Bird size={12} className={styles.brandBird} />
                </div>
                <span className={styles.brandName} style={{ fontSize: '1.05rem' }}>
                  {APP_INFO.name}
                </span>
              </div>
              <p className={styles.footerTagline}>
                {APP_INFO.tagline}. Purpose-built flock health, feed, and housing management.
              </p>
            </div>

            <div className={styles.footerNavGroup}>
              <div className={styles.footerCol}>
                <span className={styles.footerColTitle}>Navigation</span>
                <ul className={styles.footerColLinks}>
                  <li>
                    <a href="#hero" onClick={(e) => handleNavClick(e, 'hero')} className={styles.footerColLink}>
                      Home Overview
                    </a>
                  </li>
                  <li>
                    <a href="#features" onClick={(e) => handleNavClick(e, 'features')} className={styles.footerColLink}>
                      Features & Modules
                    </a>
                  </li>
                  <li>
                    <a href="#about" onClick={(e) => handleNavClick(e, 'about')} className={styles.footerColLink}>
                      About System
                    </a>
                  </li>
                  <li>
                    <a href="#benefits" onClick={(e) => handleNavClick(e, 'benefits')} className={styles.footerColLink}>
                      Farm Benefits
                    </a>
                  </li>
                </ul>
              </div>

              <div className={styles.footerCol}>
                <span className={styles.footerColTitle}>Operational Modules</span>
                <ul className={styles.footerColLinks}>
                  <li>
                    <span className={styles.footerColLink}>Dashboard Overview</span>
                  </li>
                  <li>
                    <span className={styles.footerColLink}>Flock & Individual Birds</span>
                  </li>
                  <li>
                    <span className={styles.footerColLink}>Batch & Pen Housing</span>
                  </li>
                  <li>
                    <span className={styles.footerColLink}>Feed & Nutrition</span>
                  </li>
                  <li>
                    <span className={styles.footerColLink}>Medication & Vaccines</span>
                  </li>
                  <li>
                    <span className={styles.footerColLink}>Egg Production & Grading</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <span className={styles.footerCopyright}>
              &copy; {currentYear} {APP_INFO.name}. All rights reserved.
            </span>

            <div className={styles.footerArchitectureNotice}>
              <HardDrive size={13} />
              <span>Offline-first architecture powered by IndexedDB &amp; Dexie.js. Data is stored exclusively on this device.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
