create table if not exists public.zuno_site_config (
 id text primary key default 'main' check (id='main'),
 config jsonb not null default '{}'::jsonb check (jsonb_typeof(config)='object'),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table public.zuno_site_config enable row level security;
grant select on public.zuno_site_config to anon,authenticated;
grant insert,update on public.zuno_site_config to authenticated;
drop policy if exists "Public can read ZUNO site configuration" on public.zuno_site_config;
create policy "Public can read ZUNO site configuration" on public.zuno_site_config for select to anon,authenticated using (true);
drop policy if exists "Admins can insert ZUNO site configuration" on public.zuno_site_config;
create policy "Admins can insert ZUNO site configuration" on public.zuno_site_config for insert to authenticated with check ((select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "Admins can update ZUNO site configuration" on public.zuno_site_config;
create policy "Admins can update ZUNO site configuration" on public.zuno_site_config for update to authenticated using ((select auth.jwt()->'app_metadata'->>'role')='admin') with check ((select auth.jwt()->'app_metadata'->>'role')='admin');
insert into public.zuno_site_config(id,config) values ('main', jsonb_build_object(
 'brand',jsonb_build_object('siteName','ZUNO','subtitle','Icon Store','logoUrl','./zuno-logo.svg?v=2'),
 'announcement',jsonb_build_object('enabled',false,'text','','linkLabel','','linkUrl',''),
 'navigation',jsonb_build_object('showDownload',true,'showAbout',true,'showUpload',true,'discoverLabel','Keşfet','downloadLabel','Uygulama','aboutLabel','Hakkımızda','uploadLabel','Yükle'),
 'home',jsonb_build_object('showHero',true,'showGallery',true,'showPromoVideo',true,'eyebrow','ZUNO TOPLULUĞU','title','Ana ekranına yeni bir','highlight','görünüm','description','Topluluğun tasarladığı ZUNO ikonlarını keşfet, beğendiklerini indir ve kendi tasarımını paylaş.','primaryLabel','İkon yükle','primaryHref','/upload','secondaryLabel','ZUNO APK’yı indir','secondaryHref','/download'),
 'download',jsonb_build_object('eyebrow','ZUNO ANDROID UYGULAMASI','title','Müziğin,','highlight','kendi ritminde.','description','ZUNO’yu Android cihazına yükle. Müziğini keşfet, kendi arşivini dinle ve oynatıcını tarzına göre düzenle.','apkUrl','','features',jsonb_build_array(jsonb_build_object('title','Kendi müzik alanın','description','Çevrimiçi müzik keşfi ve cihazındaki yerel müzik arşivi tek bir oynatıcı deneyiminde.'),jsonb_build_object('title','Tarzını yansıt','description','Temalar, oynatıcı görünümü, hareketler ve kişiselleştirme seçenekleri.'),jsonb_build_object('title','Dinlemeye devam et','description','Arka plan oynatma, Android medya kontrolleri ve desteklenen parçalarda senkronize şarkı sözleri.'))),
 'about',jsonb_build_object('eyebrow','BİZ KİMİZ?','title','Dinleme deneyimini','highlight','özgürleştiriyoruz.','description','ZUNO; müzik deneyimini kişiselleştirmeye, topluluğun yaratıcılığını görünür kılmaya ve uygulama görünümünü sana ait hissettirmeye odaklanan bağımsız bir projedir.','appTitle','ZUNO Player','appDescription','Android için geliştirilen ZUNO; çevrimiçi müzik keşfi, yerel müzik arşivi, arka plan oynatma, şarkı sözleri ve kişiselleştirilebilir oynatıcı deneyimini bir araya getirir.','communityTitle','ZUNO Icon Store','communityDescription','İkonlarını keşfet, beğendiklerini kaydet ve kendi tasarımlarını toplulukla paylaş. Mağazanın amacı, ZUNO deneyimini herkesin kendi tarzına göre şekillendirebilmesi.','valuesTitle','Sade, işlevsel ve topluluk odaklı.','valueOneTitle','Özenli tasarım','valueOneDescription','Görsel kalite kadar rahat kullanım ve erişilebilirlik de önemli.','valueTwoTitle','Üreten topluluk','valueTwoDescription','Herkesin kendi ikon çalışmalarını paylaşabildiği bir alan oluşturuyoruz.','valueThreeTitle','Sürekli gelişim','valueThreeDescription','Geri bildirimleri dikkate alarak uygulamayı ve mağazayı adım adım geliştiriyoruz.'),
 'appearance',jsonb_build_object('primary','#8b6cff','cyan','#38d6ff','pink','#ff6bb5'),
 'footer',jsonb_build_object('text','ZUNO · Müzik ve ikon topluluğu','githubUrl','https://github.com/mm2ultimatehub-rgb/ZUNO-Icon-Store/issues')
)) on conflict(id) do nothing;