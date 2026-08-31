// Work Tracker - Stable
const workerListEl=document.getElementById('workerList');
const workerTitleEl=document.getElementById('workerTitle');
const workerAvatarEl=document.getElementById('workerAvatar');
const statusArea=document.getElementById('statusArea');
const emptyState=document.getElementById('emptyState');
const workSection=document.getElementById('workSection');
const worksTableBody=document.querySelector('#worksTable tbody');
const formTitleEl=document.getElementById('formTitle');
const toastArea=document.getElementById('toastArea');
const workerIdInput=document.getElementById('workerId');
const workIdInput=document.getElementById('workId');
const bookNameInput=document.getElementById('bookName');
const authorNameInput=document.getElementById('authorName');
const startTimeInput=document.getElementById('startTime');
const endTimeInput=document.getElementById('endTime');
const workForm=document.getElementById('workForm');
const clearBtn=document.getElementById('clearBtn');
const refreshBtn=document.getElementById('refreshBtn');
const saveBtn=document.getElementById('saveBtn');
let currentWorker=null; let cacheData={workers:[]};
function showToast(m,t='success'){const el=document.createElement('div');el.className=`toast ${t}`;el.textContent=m;toastArea.appendChild(el);setTimeout(()=>{el.classList.add('fade-out');setTimeout(()=>el.remove(),250)},3000)}
async function fetchData(){try{const r=await fetch('/api/get_data?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Server '+r.status);const d=await r.json();if(!d||!Array.isArray(d.workers))throw new Error('Invalid data');cacheData=d;return d}catch(e){console.error(e);showToast('ডেটা লোড সমস্যা: '+e.message,'error');return cacheData}}
function renderWorkers(data){workerListEl.innerHTML='';if(!data.workers.length){workerListEl.innerHTML='<li style="padding:12px;color:#8a8172">কোনো সহযোগী নেই</li>';return}data.workers.forEach(w=>{const li=document.createElement('li');li.className='worker-card'+(currentWorker&&currentWorker.id==w.id?' active':'');li.tabIndex=0;li.innerHTML=`<div class="worker-avatar-sm">${escapeHtml((w.name||'?').trim().charAt(0))}</div><div class="worker-meta"><div class="worker-name">${escapeHtml(w.name)}</div><div class="worker-position">${escapeHtml(w.position||'')}</div></div><span class="badge ${w.blue_tick?'activeTick':'inactiveTick'}">${w.blue_tick?'সক্রিয়':'নিষ্ক্রিয়'}</span>`;li.onclick=()=>selectWorker(w.id);li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectWorker(w.id)}};workerListEl.appendChild(li)})}
async function selectWorker(id){const data=await fetchData();const w=data.workers.find(x=>x.id==id);if(!w)return;currentWorker=w;workerIdInput.value=w.id;workerTitleEl.textContent=`${w.name} (${w.position||''})`;workerAvatarEl.textContent=(w.name||'?').trim().charAt(0);statusArea.innerHTML=w.blue_tick?'<span class="badge activeTick">সক্রিয়</span>':'<span class="badge inactiveTick">নিষ্ক্রিয়</span>';emptyState.classList.add('hidden');workSection.classList.remove('hidden');resetForm();renderWorks(w.works);renderWorkers(data)}
function renderWorks(works){worksTableBody.innerHTML='';if(!works||works.length===0){worksTableBody.innerHTML='<tr class="empty-row"><td colspan="6">এখনো কোনো কাজ যোগ করা হয়নি।</td></tr>';return}const sorted=[...works].sort((a,b)=>new Date(b.start_time||0)-new Date(a.start_time||0));sorted.forEach((item,index)=>{const tr=document.createElement('tr');const endDisplay=item.end_time?escapeHtml(item.end_time.replace('T',' ')):'<span class="ongoing-tag">চলমান</span>';tr.innerHTML=`<td class="serial-cell">${index+1}</td><td>${escapeHtml(item.book_name)}</td><td>${escapeHtml(item.author_name)}</td><td>${escapeHtml((item.start_time||'').replace('T',' '))}</td><td>${endDisplay}</td><td><div class="rowActions"><button type="button" class="editBtn" data-id="${item.id}">সম্পাদনা</button><button type="button" class="deleteBtn" data-id="${item.id}">মুছুন</button></div></td>`;worksTableBody.appendChild(tr)})}
worksTableBody.addEventListener('click',e=>{const eb=e.target.closest('.editBtn');const db=e.target.closest('.deleteBtn');if(eb)editWork(eb.dataset.id);if(db)deleteWork(db.dataset.id)});
function escapeHtml(s){if(s==null)return'';return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function resetForm(){workForm.reset();workIdInput.value='';if(formTitleEl)formTitleEl.textContent='নতুন কাজ যোগ করুন';if(saveBtn)saveBtn.textContent='সংরক্ষণ করুন'}
workForm.addEventListener('submit',async e=>{e.preventDefault();if(!workerIdInput.value){showToast('প্রথমে একজন সহযোগী সিলেক্ট করুন','error');return}if(endTimeInput.value&&startTimeInput.value&&endTimeInput.value<startTimeInput.value){showToast('শেষের সময় শুরুর সময়ের আগে হতে পারে না','error');return}const payload={worker_id:workerIdInput.value,id:workIdInput.value||'',book_name:bookNameInput.value.trim(),author_name:authorNameInput.value.trim(),start_time:startTimeInput.value,end_time:endTimeInput.value||''};saveBtn.disabled=true;saveBtn.textContent='সংরক্ষণ হচ্ছে...';try{const r=await fetch('/api/save_work',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(j.success){await selectWorker(payload.worker_id);showToast('সফলভাবে সংরক্ষণ হয়েছে','success');resetForm()}else{showToast('ত্রুটি: '+(j.error||'অজানা'),'error')}}catch{showToast('সার্ভারের সাথে সংযোগ করা যায়নি','error')}finally{saveBtn.disabled=false;saveBtn.textContent=workIdInput.value?'আপডেট করুন':'সংরক্ষণ করুন'}});
clearBtn.addEventListener('click',resetForm);
async function deleteWork(id){if(!confirm('আপনি কি নিশ্চিতভাবে এই কাজটি মুছে ফেলতে চান?'))return;const wid=workerIdInput.value;try{const r=await fetch('/api/delete_work',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({worker_id:wid,id})});const j=await r.json();if(j.success){await selectWorker(wid);showToast('কাজটি মুছে ফেলা হয়েছে','success')}else{showToast('মুছে ফেলা যায়নি: '+(j.error||''),'error')}}catch{showToast('সার্ভারের সাথে সংযোগ করা যায়নি','error')}}
async function editWork(id){const data=cacheData.workers.length?cacheData:await fetchData();const w=data.workers.find(x=>x.id==currentWorker.id);if(!w)return;const item=w.works.find(x=>x.id==id);if(!item)return;workIdInput.value=item.id;bookNameInput.value=item.book_name;authorNameInput.value=item.author_name;startTimeInput.value=item.start_time||'';endTimeInput.value=item.end_time||'';if(formTitleEl)formTitleEl.textContent='কাজ সম্পাদনা করুন';saveBtn.textContent='আপডেট করুন';document.getElementById('bookName').scrollIntoView({behavior:'smooth',block:'center'})}
refreshBtn.addEventListener('click',async()=>{const d=await fetchData();renderWorkers(d);if(currentWorker)await selectWorker(currentWorker.id);showToast('তালিকা রিফ্রেশ হয়েছে','success')});
(async()=>{const d=await fetchData();renderWorkers(d);if(d.workers.length===1)selectWorker(d.workers[0].id)})();
