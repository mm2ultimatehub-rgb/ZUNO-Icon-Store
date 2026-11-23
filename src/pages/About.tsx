import { useSiteConfig } from "../lib/siteConfig";

export default function About() {
  const { config } = useSiteConfig();
  return <section className="about-page">
    <a className="back" href="#/">← Ana sayfaya dön</a>
    <div className="about-hero glass">
      <div className="about-logo"><img src={config.brand.logoUrl || "./zuno-logo.svg"} alt="ZUNO" /></div>
      <p className="eyebrow">{config.about.eyebrow}</p>
      <h1>{config.about.title} <span className="grad">{config.about.highlight}</span></h1>
      <p className="lead">{config.about.description}</p>
    </div>
    <div className="about-grid">
      <article className="glass about-card"><span className="about-number">01 / UYGULAMA</span><h2>{config.about.appTitle}</h2><p>{config.about.appDescription}</p><a href="#/download">{config.about.appLinkLabel}</a></article>
      <article className="glass about-card"><span className="about-number">02 / TOPLULUK</span><h2>{config.about.communityTitle}</h2><p>{config.about.communityDescription}</p><a href="#/">{config.about.communityLinkLabel}</a></article>
    </div>
    <section className="about-values glass"><p className="eyebrow">{config.about.valuesEyebrow}</p><h2>{config.about.valuesTitle}</h2><div className="about-value-list">
      <div><strong>{config.about.valueOneTitle}</strong><p>{config.about.valueOneDescription}</p></div>
      <div><strong>{config.about.valueTwoTitle}</strong><p>{config.about.valueTwoDescription}</p></div>
      <div><strong>{config.about.valueThreeTitle}</strong><p>{config.about.valueThreeDescription}</p></div>
    </div></section>
    <div className="about-contact"><span>{config.about.contactLabel}</span><a href={config.about.contactUrl} target="_blank" rel="noreferrer">{config.about.contactLinkLabel}</a></div>
  </section>;
}