'use client';

import { useEffect, useMemo, useState } from 'react';

const restaurantData: Record<string, { name: string; area: string; rating: number; eta: string; image: string }[]> = {
  Lahore: [{ name: 'Bukhara Kitchen', area: 'Gulberg', rating: 4.8, eta: '25–35 min', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85' }, { name: 'Lahore Tandoor House', area: 'Johar Town', rating: 4.6, eta: '30–40 min', image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=85' }],
  Karachi: [{ name: 'Karachi Bites', area: 'DHA', rating: 4.7, eta: '20–30 min', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85' }],
  Islamabad: [{ name: 'Islamabad Grill', area: 'F-7', rating: 4.9, eta: '25–40 min', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85' }],
  Peshawar: [{ name: 'Peshawar Chapli Hub', area: 'Hayatabad', rating: 4.7, eta: '30–45 min', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85' }],
  Rawalpindi: [{ name: 'Sweet & Spice', area: 'Saddar', rating: 4.5, eta: '20–30 min', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=85' }],
};

export default function CityHome() {
  const [cities, setCities] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem('easy-food-city');
    if (saved) setSelected(saved);
    fetch('/api/pakistan-cities')
      .then(r => r.json())
      .then(data => {
        if (!data.cities) throw new Error(data.error || 'Unable to load cities');
        setCities(data.cities);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cities.filter(city => !q || city.toLowerCase().includes(q));
  }, [cities, query]);

  const choose = (city: string) => {
    setSelected(city);
    window.localStorage.setItem('easy-food-city', city);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const restaurants = selected ? (restaurantData[selected] || []) : [];

  return <div className="page">
    <style>{styles}</style>
    <header className="header">
      <button className="menu" aria-label="Menu">☰</button>
      <div className="brand"><span>EF</span><b>Easy</b> Food</div>
      <div className="headerRight"><button>Help</button><button>Partner with us</button></div>
    </header>

    <main>
      <section className="hero">
        <div className="heroGlow" />
        <div className="heroInner">
          <div className="eyebrow">EASY FOOD • PAKISTAN</div>
          <h1>{selected ? <>Restaurants in <em>{selected}</em></> : <>Your city.<br/><em>Your food.</em></>}</h1>
          <p>{selected ? 'Only restaurants serving your selected city are shown below.' : 'Select your city once and Easy Food will show restaurants available in that city.'}</p>
          <div className="searchBox">
            <span>⌕</span>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your city... e.g. Lahore, Multan, Abbottabad" />
            {query && <button onClick={() => setQuery('')}>×</button>}
          </div>
          <div className="meta"><span>✓ Pakistan cities & urban localities</span><span>✓ A–Z search</span><span>✓ City-based restaurants</span></div>
        </div>
      </section>

      <section className="citySection">
        <div className="sectionTop">
          <div><div className="eyebrow">LOCATION</div><h2>{loading ? 'Loading Pakistan locations…' : `${filtered.length.toLocaleString()} locations`}</h2></div>
          {selected && <button className="change" onClick={() => setSelected('')}>Change city</button>}
        </div>
        {error ? <div className="error">{error}<button onClick={() => location.reload()}>Retry</button></div> : loading ? <div className="loading">Loading the official 2023 city/locality list…</div> : <div className="cityList">{filtered.map(city => <button key={city} className={selected === city ? 'city selected' : 'city'} onClick={() => choose(city)}><span>📍</span><div><strong>{city}</strong><small>Restaurants & delivery</small></div><b>→</b></button>)}</div>}
      </section>

      {selected && <section className="restaurants">
        <div className="sectionTop"><div><div className="eyebrow">RESTAURANTS</div><h2>Available in {selected}</h2></div></div>
        {restaurants.length ? <div className="restaurantGrid">{restaurants.map(r => <article key={r.name} className="restaurant"><img src={r.image} alt=""/><div className="restaurantBody"><h3>{r.name}</h3><p>Pakistani • BBQ • Fast food</p><div>★ {r.rating} &nbsp; • &nbsp; 🕐 {r.eta}</div><footer>📍 {r.area}, {selected}<button>View menu →</button></footer></div></article>)}</div> : <div className="empty"><div>🍽️</div><h3>No restaurant has been verified in {selected} yet</h3><p>As restaurants register and are approved for this city, they will appear here automatically.</p></div>}
      </section>}
    </main>

    <footer className="footer"><div className="brand"><span>EF</span><b>Easy</b> Food</div><p>Local food. Verified restaurants. Better delivery.</p><small>City data source: Pakistan Bureau of Statistics, Census 2023.</small></footer>
  </div>;
}

const styles = `
*{box-sizing:border-box}.page{min-height:100vh;background:#f7f9fc;color:#101c31;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.header{height:76px;background:#fff;border-bottom:1px solid #e7ebf2;display:flex;align-items:center;padding:0 clamp(18px,5vw,72px);gap:22px;position:sticky;top:0;z-index:20}.menu{width:44px;height:44px;border:1px solid #e2e7ef;background:#fff;border-radius:12px;font-size:20px;cursor:pointer}.brand{display:flex;align-items:center;gap:7px;font-size:22px;letter-spacing:-.7px}.brand span{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#20a9e8,#d94b9d);color:#fff;font-size:13px;font-weight:900}.brand b{font-weight:800}.headerRight{margin-left:auto;display:flex;gap:10px}.headerRight button,.change{border:1px solid #e1e6ee;background:#fff;border-radius:12px;padding:11px 16px;font-weight:700;cursor:pointer}.hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#071a37,#112e55);color:#fff}.heroGlow{position:absolute;width:700px;height:700px;border-radius:50%;right:-180px;top:-360px;background:radial-gradient(circle,rgba(42,181,236,.32),transparent 65%)}.heroInner{position:relative;max-width:1050px;margin:auto;padding:74px 24px 64px}.eyebrow{font-size:12px;font-weight:900;letter-spacing:2px;color:#31b7ef}.hero h1{font-size:clamp(40px,6vw,72px);line-height:1.02;letter-spacing:-3px;margin:16px 0}.hero h1 em{font-style:normal;background:linear-gradient(90deg,#38c1ef,#ec65a9);-webkit-background-clip:text;background-clip:text;color:transparent}.hero p{max-width:650px;color:#b9c7db;font-size:18px;line-height:1.65;margin:0 0 28px}.searchBox{max-width:820px;background:#fff;border-radius:18px;padding:7px 9px 7px 20px;display:flex;align-items:center;box-shadow:0 18px 55px rgba(0,0,0,.24)}.searchBox span{font-size:27px;color:#72809a}.searchBox input{border:0;outline:0;flex:1;padding:16px 12px;font-size:17px;color:#111c31;background:transparent}.searchBox button{border:0;background:#edf1f6;width:40px;height:40px;border-radius:10px;font-size:22px;cursor:pointer}.meta{display:flex;flex-wrap:wrap;gap:18px;margin-top:18px;color:#d5dfec;font-size:13px}.citySection,.restaurants{max-width:1100px;margin:auto;padding:48px 24px}.sectionTop{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px}.sectionTop h2{font-size:30px;letter-spacing:-1px;margin:5px 0 0}.cityList{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-height:610px;overflow:auto;padding-right:5px}.city{display:flex;align-items:center;gap:13px;text-align:left;border:1px solid #e2e7ef;background:#fff;border-radius:15px;padding:15px;cursor:pointer;transition:.16s}.city:hover{transform:translateY(-1px);border-color:#9ddcf3;box-shadow:0 8px 25px rgba(16,31,55,.08)}.city.selected{border-color:#25afe8;background:#effaff}.city>span{font-size:20px}.city div{flex:1}.city strong{display:block;font-size:15px}.city small{display:block;color:#7b889d;margin-top:3px}.city>b{color:#9ba7b8}.loading,.error,.empty{background:#fff;border:1px solid #e3e8ef;border-radius:18px;padding:30px;text-align:center;color:#6c7b91}.error button{margin-left:10px;border:0;background:#101c31;color:#fff;padding:9px 14px;border-radius:10px}.restaurantGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.restaurant{background:#fff;border:1px solid #e3e8ef;border-radius:18px;overflow:hidden}.restaurant img{width:100%;height:190px;object-fit:cover}.restaurantBody{padding:18px}.restaurantBody h3{font-size:21px;margin:0 0 5px}.restaurantBody p{color:#7a879a;margin:0 0 13px}.restaurantBody footer{display:flex;align-items:center;gap:10px;border-top:1px solid #edf0f4;margin-top:15px;padding-top:13px;color:#6f7c90;font-size:13px}.restaurantBody footer button{margin-left:auto;border:0;background:#101c31;color:#fff;border-radius:9px;padding:9px 12px;font-weight:700}.empty h3{margin:10px 0 5px}.empty p{margin:0}.footer{border-top:1px solid #e4e8ef;background:#fff;padding:35px clamp(24px,6vw,90px);display:flex;align-items:center;gap:22px;flex-wrap:wrap}.footer p{color:#7a8798}.footer small{margin-left:auto;color:#8a95a6}@media(max-width:800px){.headerRight{display:none}.heroInner{padding-top:52px}.cityList{grid-template-columns:1fr 1fr}.restaurantGrid{grid-template-columns:1fr}.footer small{margin-left:0;width:100%}}@media(max-width:520px){.cityList{grid-template-columns:1fr}.hero h1{letter-spacing:-2px}.meta{gap:8px;flex-direction:column}.sectionTop{align-items:flex-start;flex-direction:column}}
`;
