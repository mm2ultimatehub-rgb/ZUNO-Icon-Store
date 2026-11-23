export default function About() {
  return <section className="about-page">
    <a className="back" href="#/">← Ana sayfaya dön</a>
    <div className="about-hero glass">
      <div className="about-logo"><img src="./zuno-logo.svg" alt="ZUNO" /></div>
      <p className="eyebrow">BİZ KİMİZ?</p>
      <h1>Dinleme deneyimini <span className="grad">özgürleştiriyoruz.</span></h1>
      <p className="lead">ZUNO; müzik deneyimini kişiselleştirmeye, topluluğun yaratıcılığını görünür kılmaya ve uygulama görünümünü sana ait hissettirmeye odaklanan bağımsız bir projedir.</p>
    </div>
    <div className="about-grid">
      <article className="glass about-card"><span className="about-number">01 / UYGULAMA</span><h2>ZUNO Player</h2><p>Android için geliştirilen ZUNO; çevrimiçi müzik keşfi, yerel müzik arşivi, arka plan oynatma, şarkı sözleri ve kişiselleştirilebilir oynatıcı deneyimini bir araya getirir.</p><a href="#/download">Android uygulamasını keşfet ↗</a></article>
      <article className="glass about-card"><span className="about-number">02 / TOPLULUK</span><h2>ZUNO Icon Store</h2><p>İkonlarını keşfet, beğendiklerini kaydet ve kendi tasarımlarını toplulukla paylaş. Mağazanın amacı, ZUNO deneyimini herkesin kendi tarzına göre şekillendirebilmesi.</p><a href="#/">İkonları keşfet ↗</a></article>
    </div>
    <section className="about-values glass"><p className="eyebrow">YAKLAŞIMIMIZ</p><h2>Sade, işlevsel ve topluluk odaklı.</h2><div className="about-value-list">
      <div><strong>Özenli tasarım</strong><p>Görsel kalite kadar rahat kullanım ve erişilebilirlik de önemli.</p></div>
      <div><strong>Üreten topluluk</strong><p>Herkesin kendi ikon çalışmalarını paylaşabildiği bir alan oluşturuyoruz.</p></div>
      <div><strong>Sürekli gelişim</strong><p>Geri bildirimleri dikkate alarak uygulamayı ve mağazayı adım adım geliştiriyoruz.</p></div>
    </div></section>
    <div className="about-contact"><span>Bir fikrin veya önerin mi var?</span><a href="https://github.com/mm2ultimatehub-rgb/ZUNO-Icon-Store/issues" target="_blank" rel="noreferrer">GitHub üzerinden bize ulaş ↗</a></div>
  </section>;
}