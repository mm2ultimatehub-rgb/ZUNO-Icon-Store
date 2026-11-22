export default function UploadWaveLoader({ preview, title }: { preview: string; title: string }) {
  return (
    <div className="upload-wave-loader" role="status" aria-live="polite">
      <div className="upload-wave-loader__visual">
        <span className="upload-wave-loader__wave upload-wave-loader__wave--one" />
        <span className="upload-wave-loader__wave upload-wave-loader__wave--two" />
        <span className="upload-wave-loader__wave upload-wave-loader__wave--three" />
        <div className="upload-wave-loader__image">
          {preview ? <img src={preview} alt="" /> : <span className="upload-wave-loader__fallback">Z</span>}
        </div>
        <span className="upload-wave-loader__spark upload-wave-loader__spark--a" />
        <span className="upload-wave-loader__spark upload-wave-loader__spark--b" />
      </div>
      <strong>İkonun paylaşılıyor</strong>
      <span className="upload-wave-loader__filename">{title || "Dosya hazırlanıyor"}</span>
      <div className="upload-wave-loader__track"><i /></div>
      <small>Dosyan güvenli biçimde yükleniyor. Bu ekran işlem tamamlanana kadar açık kalacak.</small>
    </div>
  );
}
