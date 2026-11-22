const seedPlans = [
 {id:"weekly-15",name:"15GB Data",data:"15GB",validity:"7 days",price:0.99,active:true},
 {id:"fortnight-35",name:"35GB Data",data:"35GB",validity:"14 days",price:1.99,active:true},
 {id:"three-weeks-50",name:"50GB Data",data:"50GB",validity:"21 days",price:2.99,active:true},
 {id:"monthly-unlimited",name:"Monthly Unlimited",data:"Unlimited",validity:"30 days",price:3.99,active:true},
 {id:"monthly-5g",name:"5G Monthly Unlimited",data:"5G Unlimited",validity:"30 days",price:7.99,active:true}
];
const seedTransactions = [
 {ref:"STC-10482",name:"Tendai M.",email:"tendai@example.test",phone:"+263 77 000 0101",plan:"Monthly Unlimited",date:"2026-11-21",amount:3.99,status:"Successful"},
 {ref:"STC-10481",name:"Rudo K.",email:"rudo@example.test",phone:"+263 77 000 0102",plan:"35GB Data",date:"2026-11-21",amount:1.99,status:"Pending"},
 {ref:"STC-10480",name:"Kuda N.",email:"kuda@example.test",phone:"+263 77 000 0103",plan:"15GB Data",date:"2026-11-20",amount:0.99,status:"Successful"},
 {ref:"STC-10479",name:"Nyasha P.",email:"nyasha@example.test",phone:"+263 77 000 0104",plan:"5G Monthly Unlimited",date:"2026-11-20",amount:7.99,status:"Failed"},
 {ref:"STC-10478",name:"Farai D.",email:"farai@example.test",phone:"+263 77 000 0105",plan:"50GB Data",date:"2026-11-19",amount:2.99,status:"Successful"}
];
const $ = s => document.querySelector(s);
const read = (key, fallback) => { try { const value=localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
let plans = read("stc_admin_plans", seedPlans);
let transactions = read("stc_admin_transactions", seedTransactions);
const save = () => { localStorage.setItem("stc_admin_plans",JSON.stringify(plans)); localStorage.setItem("stc_admin_transactions",JSON.stringify(transactions)); };
const money = value => "$"+Number(value).toFixed(2);
const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2600);}
function statusBadge(status){return `<span class="status ${esc(status)}">${esc(status)}</span>`;}
function showView(name){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));$("#pageTitle").textContent=name[0].toUpperCase()+name.slice(1);$("#sidebar").classList.remove("open");}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.goto)));
$("#menuButton").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#todayDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",year:"numeric",month:"short",day:"numeric"});

function renderOverview(){
 const successful=transactions.filter(t=>t.status==="Successful");
 const customers=new Set(transactions.map(t=>t.email));
 $("#statCustomers").textContent=customers.size;
 $("#statTransactions").textContent=transactions.length;
 $("#statSuccessful").textContent=successful.length;
 $("#statRevenue").textContent=money(successful.reduce((sum,t)=>sum+Number(t.amount),0));
 $("#recentTransactions").innerHTML=transactions.slice(0,5).map(t=>`<tr><td class="ref">${esc(t.ref)}</td><td>${esc(t.name)}</td><td>${esc(t.plan)}</td><td>${money(t.amount)}</td><td>${statusBadge(t.status)}</td></tr>`).join("")||'<tr><td colspan="5">No transactions yet.</td></tr>';
}
function renderPlans(){
 $("#planCount").textContent=plans.length+" plans";
 $("#plansTable").innerHTML=plans.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.data)}</td><td>${esc(p.validity)}</td><td>${money(p.price)}</td><td>${p.active?'<span class="status Successful">Active</span>':'<span class="status Pending">Hidden</span>'}</td><td><button class="table-action" data-edit="${esc(p.id)}">Edit</button> <button class="table-action" data-toggle="${esc(p.id)}">${p.active?"Hide":"Activate"}</button></td></tr>`).join("")||'<tr><td colspan="6">No plans. Add your first plan.</td></tr>';
}
function renderTransactions(){
 const q=$("#transactionSearch").value.toLowerCase(), filter=$("#statusFilter").value;
 const rows=transactions.filter(t=>(filter==="all"||t.status===filter)&&[t.ref,t.name,t.email,t.plan].some(v=>v.toLowerCase().includes(q)));
 $("#transactionsTable").innerHTML=rows.map(t=>`<tr><td class="ref">${esc(t.ref)}</td><td>${esc(t.name)}<br><small>${esc(t.email)}</small></td><td>${esc(t.plan)}</td><td>${esc(t.date)}</td><td>${money(t.amount)}</td><td>${statusBadge(t.status)}</td><td><select class="table-action" data-status="${esc(t.ref)}" aria-label="Update ${esc(t.ref)} status"><option ${t.status==="Pending"?"selected":""}>Pending</option><option ${t.status==="Successful"?"selected":""}>Successful</option><option ${t.status==="Failed"?"selected":""}>Failed</option></select></td></tr>`).join("")||'<tr><td colspan="7">No matching transactions.</td></tr>';
}
function renderCustomers(){
 const q=$("#customerSearch").value.toLowerCase();
 const map=new Map();
 transactions.forEach(t=>{if(!map.has(t.email))map.set(t.email,{...t,orders:0,last:t.date});const c=map.get(t.email);c.orders++;if(t.date>c.last)c.last=t.date;});
 const rows=[...map.values()].filter(c=>[c.name,c.email,c.phone].some(v=>v.toLowerCase().includes(q)));
 $("#customerCount").textContent=map.size+" customers";
 $("#customersTable").innerHTML=rows.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td><td>${c.orders}</td><td>${esc(c.last)}</td></tr>`).join("")||'<tr><td colspan="5">No customers found.</td></tr>';
}
function renderAll(){renderOverview();renderPlans();renderTransactions();renderCustomers();}
function openPlanDialog(plan){
 $("#planForm").reset();$("#planId").value=plan?.id||"";$("#dialogTitle").textContent=plan?"Edit data plan":"Add data plan";
 $("#planName").value=plan?.name||"";$("#planData").value=plan?.data||"";$("#planValidity").value=plan?.validity||"";$("#planPrice").value=plan?.price??0;$("#planActive").value=String(plan?.active??true);$("#planDialog").hidden=false;$("#planName").focus();
}
function closeDialog(){$("#planDialog").hidden=true;}
$("#addPlanButton").addEventListener("click",()=>openPlanDialog());
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",closeDialog));
$("#planDialog").addEventListener("click",e=>{if(e.target===$("#planDialog"))closeDialog();});
$("#planForm").addEventListener("submit",e=>{
 e.preventDefault();const id=$("#planId").value||"plan-"+Date.now();
 const item={id,name:$("#planName").value.trim(),data:$("#planData").value.trim(),validity:$("#planValidity").value.trim(),price:Number($("#planPrice").value),active:$("#planActive").value==="true"};
 if(!item.name||!item.data||!item.validity||!Number.isFinite(item.price)||item.price<0)return;
 const index=plans.findIndex(p=>p.id===id);if(index>=0)plans[index]=item;else plans.push(item);
 save();closeDialog();renderAll();toast("Plan saved in this browser.");
});
$("#plansTable").addEventListener("click",e=>{
 const edit=e.target.closest("[data-edit]"),toggle=e.target.closest("[data-toggle]");
 if(edit){const plan=plans.find(p=>p.id===edit.dataset.edit);if(plan)openPlanDialog(plan);}
 if(toggle){const plan=plans.find(p=>p.id===toggle.dataset.toggle);if(plan){plan.active=!plan.active;save();renderAll();toast("Plan visibility updated.");}}
});
$("#transactionSearch").addEventListener("input",renderTransactions);
$("#statusFilter").addEventListener("change",renderTransactions);
$("#transactionsTable").addEventListener("change",e=>{
 const select=e.target.closest("[data-status]");if(!select)return;
 const transaction=transactions.find(t=>t.ref===select.dataset.status);if(transaction){transaction.status=select.value;save();renderAll();toast("Demo transaction status updated.");}
});
$("#customerSearch").addEventListener("input",renderCustomers);
$("#exportButton").addEventListener("click",()=>{
 const header=["Reference","Customer","Email","Phone","Plan","Date","Amount USD","Status"];
 const lines=[header,...transactions.map(t=>[t.ref,t.name,t.email,t.phone,t.plan,t.date,t.amount,t.status])];
 const csv=lines.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="starlink-transactions-demo.csv";a.click();URL.revokeObjectURL(url);
});
renderAll();