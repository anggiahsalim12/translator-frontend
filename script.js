// public/script.js
(function(){
  'use strict';
  const $ = (id)=>document.getElementById(id);

  // Data kamus
  const DICT = {"Kategori":{
    "Hewan":[
      {"ind":"kucing","ter":"tuso","img": "img/kucing.png"},
      {"ind":"anjing","ter":"asu","img":"assets/img/anjing.png"},
      {"ind":"ikan","ter":"ikan","img":"assets/img/ikan.png"}
    ],
    "Keluarga":[
      {"ind":"ayah","ter":"baba","img":"assets/img/ayah.png"},
      {"ind":"ibu","ter":"yaya","img":"assets/img/ibu.png"},
      {"ind":"kakak","ter":"kaka","img":"assets/img/kakak.png"}
    ],
    "Buah-Buahan":[
      {"ind":"Anggur","ter":"gur","img":"assets/img/ayah.png"},
      {"ind":"Jambu Air","ter":"Gora","img":"assets/img/ibu.png"},
    ],
    "Umum":[
      {"ind":"pasar","ter":"pasar","img":"assets/img/pasar.png"},
      {"ind":"rumah","ter":"ofo","img":"assets/img/rumah.png"},
      {"ind":"sekolah","ter":"sekolah","img":"assets/img/sekolah.png"}
    ]
  }};

  // Buat map kata
  const mapIdToTt=new Map(), mapTtToId=new Map();
  Object.values(DICT.Kategori).forEach(arr=> (arr||[]).forEach(it=>{
    if(!it.ind||!it.ter) return; 
    mapIdToTt.set(it.ind.toLowerCase(),it.ter); 
    mapTtToId.set(it.ter.toLowerCase(),it.ind);
  }));

  // Fungsi translate
  function tokenize(t){return String(t).match(/[A-Za-zÀ-ÿ0-9]+|[^\sA-Za-zÀ-ÿ0-9]/g)||[];}
  function translateWithMap(text, dir){
    const out = tokenize(text).map(tok=>{
      const low=tok.toLowerCase();
      let mapped = (dir==='id-to-tt')?mapIdToTt.get(low):mapTtToId.get(low);
      if(mapped){ 
        if(/^[A-Z]/.test(tok)) mapped=mapped.charAt(0).toUpperCase()+mapped.slice(1); 
        return mapped; 
      }
      return tok;
    });
    return out.map((w,i)=>(i>0 && !/^[.,!?;:)\]]/.test(w)?' '+w:w)).join('').trim();
  }

  // Fungsi panggil OpenAI
  async function callOpenAIcorrect(text){
    const system='Kamu adalah korektor tata bahasa Indonesia. Perbaiki ejaan dan tata bahasa tanpa mengubah makna. Kembalikan hanya kalimat yang sudah diperbaiki.';
    const body={ model:(typeof OPENAI_MODEL!=='undefined'?OPENAI_MODEL:'gpt-4o-mini'),
      messages:[{role:'system',content:system},{role:'user',content:`Perbaiki kalimat ini: "${text}"`}], temperature:0 };
    const resp=await fetch((typeof API_PROXY_URL!=='undefined'?API_PROXY_URL:'/api/correct'),{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!resp.ok) throw new Error('Proxy '+resp.status);
    const j=await resp.json(); return j?.choices?.[0]?.message?.content?.trim()||'';
  }

  // Render kategori (dengan gambar)
  function renderCategory(which){
    const row=$('cardsRow'); 
    if(!row) return; 
    const cats=DICT.Kategori; 
    const names=Object.keys(cats); 
    if(!which) which=names[0];

    row.innerHTML='';
    (cats[which]||[]).forEach(it=>{
      const div=document.createElement('div'); 
      div.className='col-6 col-md-4 col-lg-3';
      div.innerHTML=`
        <div class="card h-100">
          ${it.img ? `<img src="${it.img}" class="card-img-top" alt="${it.ind}">` : ''}
          <div class="card-body text-center">
            <div class="small text-muted">${which}</div>
            <div class="fw-bold">${it.ind}</div>
            <div>${it.ter}</div>
          </div>
        </div>`;
      row.appendChild(div); 
    });
  }

  // Dropdown kategori
  function populateCategoryDropdown(){
    const sel=$('categorySelect'); 
    if(!sel) return;
    const cats=Object.keys(DICT.Kategori);
    sel.innerHTML='';
    cats.forEach(c=>{
      const opt=document.createElement('option');
      opt.value=c;
      opt.textContent=c;
      sel.appendChild(opt);
    });
    sel.value=cats[0]; // default
    sel.addEventListener('change', ()=> renderCategory(sel.value));
  }

  // Filter pencarian
  function renderFilter(q){
    const row=$('cardsRow'); 
    row.innerHTML=''; 
    const all=[]; 
    Object.entries(DICT.Kategori).forEach(([k,arr])=>(arr||[]).forEach(it=>all.push({...it,cat:k})));
    const filtered=all.filter(it=>it.ind.toLowerCase().includes(q)||it.ter.toLowerCase().includes(q));
    filtered.slice(0,60).forEach(it=>{
      const div=document.createElement('div'); 
      div.className='col-6 col-md-4 col-lg-3';
      div.innerHTML=`
        <div class="card h-100">
          ${it.img ? `<img src="${it.img}" class="card-img-top" alt="${it.ind}">` : ''}
          <div class="card-body text-center">
            <div class="small text-muted">${it.cat}</div>
            <div class="fw-bold">${it.ind}</div>
            <div>${it.ter}</div>
          </div>
        </div>`;
      row.appendChild(div); 
    });
  }

  // Init UI
  function initUI(){
    populateCategoryDropdown();
    renderCategory();

    $('translateBtn')?.addEventListener('click', async ()=>{
      const raw=$('inputText')?.value?.trim()||''; 
      if(!raw) return alert('Isi teks dulu'); 
      $('log').textContent='Memproses...';
      let source=raw;
      try{
        if($('useAI')?.checked){ 
          try{ 
            const corrected=await callOpenAIcorrect(raw); 
            source=corrected||raw; 
            $('log').textContent='Kalimat diperbaiki (AI) → diterjemahkan'; 
          }
          catch(e){ $('log').textContent='AI gagal: '+e.message+' → pakai teks asli'; } 
        }
        else { $('log').textContent='Mode tanpa AI → langsung terjemah'; }
      } finally { 
        $('outputText').value=translateWithMap(source, $('direction')?.value||'id-to-tt'); 
      }
    });

    $('translateSimpleBtn')?.addEventListener('click', ()=>{
      const raw=$('inputText')?.value?.trim()||''; 
      $('outputText').value=translateWithMap(raw, $('direction')?.value||'id-to-tt'); 
    });

    $('clearBtn')?.addEventListener('click', ()=>{
      $('inputText').value=''; 
      $('outputText').value=''; 
      $('log').textContent=''; 
    });

    $('swapBtn')?.addEventListener('click', ()=>{
      const sel=$('direction'); 
      if(sel) sel.value= sel.value==='id-to-tt'?'tt-to-id':'id-to-tt'; 
    });

    $('copyBtn')?.addEventListener('click', async ()=>{
      try{ 
        await navigator.clipboard.writeText($('outputText').value||''); 
        const old=$('copyBtn').textContent; 
        $('copyBtn').textContent='✓ Tersalin'; 
        setTimeout(()=>$('copyBtn').textContent=old,1200);
      }catch{alert('Gagal salin');} 
    });

    $('speakBtn')?.addEventListener('click', ()=>{
      const t=$('outputText')?.value||''; 
      if(!('speechSynthesis' in window)) return alert('Speech tidak didukung'); 
      const u=new SpeechSynthesisUtterance(t); 
      u.lang='id-ID'; 
      speechSynthesis.speak(u); 
    });

    $('btnSearch')?.addEventListener('click', ()=>{
      const q=$('searchWord')?.value?.trim().toLowerCase()||''; 
      if(q) renderFilter(q); 
      else renderCategory($('categorySelect').value); 
    });

    $('searchWord')?.addEventListener('input', ()=>{
      const q=$('searchWord')?.value?.trim().toLowerCase()||''; 
      if(q) renderFilter(q); 
      else renderCategory($('categorySelect').value); 
    });
  }

  document.addEventListener('DOMContentLoaded', initUI);
})();
