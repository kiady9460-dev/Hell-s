import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

const STORE_KEY = '@life-control-pro/v1';
const BLUE = '#2878FF';
const BG = '#080B12';
const CARD = '#111725';
const LINE = '#202A3C';
const MUTED = '#9BA8BE';
const WHITE = '#F5F7FC';
const NAV = [
  ['Accueil', '⌂'], ['Planning', '▦'], ['Tâches', '✓'],
  ['Habitudes', '↻'], ['Objectifs', '◎']
];
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const initialData = {
  tasks: [], events: [], habits: [
    {id:'h-water', name:'Boire de l’eau', detail:'Objectif quotidien', done:false},
    {id:'h-read', name:'Lire', detail:'Même 10 minutes', done:false},
    {id:'h-hygiene', name:'Hygiène personnelle', detail:'Routine quotidienne', done:false},
    {id:'h-sleep', name:'Respecter mon sommeil', detail:'Heure de coucher régulière', done:false}
  ], goals: []
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false
  })
});

export default function App() {
  const [tab, setTab] = useState('Accueil');
  const [data, setData] = useState(initialData);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setData({...initialData, ...saved});
        }
      } catch (e) {
        Alert.alert('Sauvegarde', 'Les données enregistrées n’ont pas pu être chargées.');
      } finally { setLoaded(true); }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(data)).catch(() =>
      Alert.alert('Sauvegarde', 'Impossible d’enregistrer les modifications sur cet appareil.')
    );
  }, [data, loaded]);

  const completed = data.tasks.filter(t => t.done).length;
  const taskProgress = data.tasks.length ? Math.round(completed / data.tasks.length * 100) : 0;
  const habitDone = data.habits.filter(h => h.done).length;
  const todayEvents = data.events.filter(e => !e.date || e.date === todayKey()).length;
  const todayTasks = data.tasks.filter(t => !t.date || t.date === todayKey());
  const dateLabel = new Date().toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});

  function openForm(kind, item=null) {
    setForm(item ? {...item} : defaultForm(kind));
    setModal({kind, itemId:item?.id || null});
  }
  function defaultForm(kind) {
    if (kind === 'task') return {title:'', priority:'Moyenne', category:'Personnel', date:todayKey()};
    if (kind === 'event') return {title:'', time:'09:00', date:todayKey(), note:''};
    if (kind === 'habit') return {name:'', detail:'', done:false};
    return {title:'', detail:'', target:'', progress:'0'};
  }
  function updateForm(key, value) { setForm(prev => ({...prev, [key]:value})); }
  function saveForm() {
    const kind = modal?.kind;
    if (!kind) return;
    const title = (form.title || form.name || '').trim();
    if (!title) {
      Alert.alert('Champ obligatoire', 'Ajoute un nom ou un titre avant d’enregistrer.');
      return;
    }
    const key = kind === 'task' ? 'tasks' : kind === 'event' ? 'events' : kind === 'habit' ? 'habits' : 'goals';
    const item = {...form, id:modal.itemId || uid()};
    setData(prev => {
      const list = prev[key] || [];
      const exists = list.some(x => x.id === item.id);
      return {...prev, [key]: exists ? list.map(x => x.id === item.id ? item : x) : [item, ...list]};
    });
    setModal(null);
  }
  function removeItem(key, id) {
    Alert.alert('Supprimer ?', 'Cette action est définitive.', [
      {text:'Annuler', style:'cancel'},
      {text:'Supprimer', style:'destructive', onPress:() => setData(prev => ({...prev, [key]:prev[key].filter(x=>x.id!==id)}))}
    ]);
  }
  function toggleTask(id) {
    setData(prev => ({...prev, tasks:prev.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)}));
  }
  function toggleHabit(id) {
    setData(prev => ({...prev, habits:prev.habits.map(h=>h.id===id?{...h,done:!h.done}:h)}));
  }
  async function enableReminder() {
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Autorisation requise', 'Autorise les notifications dans les paramètres Android pour recevoir des rappels.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {title:'LIFE CONTROL PRO', body:'Petit rappel : consulte tes tâches et tes priorités du jour.'},
        trigger: {type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 60 * 60 * 24, repeats:true}
      });
      Alert.alert('Rappel activé', 'Un rappel quotidien est programmé (dans environ 24 heures).');
    } catch (e) { Alert.alert('Notifications indisponibles', 'Vérifie la configuration Expo et les autorisations du téléphone.'); }
  }
  async function exportBackup() {
    try {
      const json = JSON.stringify({exportedAt:new Date().toISOString(), data}, null, 2);
      await AsyncStorage.setItem('@life-control-pro/last-export', json);
      Alert.alert('Copie préparée', 'Une copie JSON a été préparée dans le stockage local de l’application. Pour l’exporter vers un fichier, ajoute ensuite un module de partage de fichiers.');
    } catch { Alert.alert('Erreur', 'La copie de sauvegarde n’a pas pu être créée.'); }
  }
  function resetData() {
    Alert.alert('Effacer toutes les données ?', 'Cette action supprimera les tâches, activités, habitudes et objectifs enregistrés sur cet appareil.', [
      {text:'Annuler', style:'cancel'},
      {text:'Tout effacer', style:'destructive', onPress:() => setData(initialData)}
    ]);
  }

  if (!loaded) return <SafeAreaView style={s.screen}><Text style={s.loading}>LIFE CONTROL PRO</Text><Text style={s.muted}>Chargement de tes données…</Text></SafeAreaView>;

  return (
    <SafeAreaView style={s.screen}>
      <ExpoStatusBar style="light" />
      <View style={s.header}>
        <View><Text style={s.brand}>LIFE CONTROL <Text style={{color:BLUE}}>PRO</Text></Text><Text style={s.tagline}>PILOTE TA JOURNÉE</Text></View>
        <View style={s.avatar}><Text style={s.avatarText}>LC</Text></View>
      </View>
      <View style={s.main}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:22}}>
        {tab === 'Accueil' && <Home dateLabel={dateLabel} tasks={todayTasks} events={data.events} goals={data.goals} taskProgress={taskProgress} habitDone={habitDone} habits={data.habits} onTask={toggleTask} onAddTask={()=>openForm('task')} onAddEvent={()=>openForm('event')} onGo={setTab} />}
        {tab === 'Planning' && <Planning events={data.events} onAdd={()=>openForm('event')} onEdit={e=>openForm('event',e)} onDelete={id=>removeItem('events',id)} onReminder={enableReminder} />}
        {tab === 'Tâches' && <Tasks tasks={data.tasks} onAdd={()=>openForm('task')} onEdit={t=>openForm('task',t)} onToggle={toggleTask} onDelete={id=>removeItem('tasks',id)} />}
        {tab === 'Habitudes' && <Habits habits={data.habits} onAdd={()=>openForm('habit')} onEdit={h=>openForm('habit',h)} onToggle={toggleHabit} onDelete={id=>removeItem('habits',id)} />}
        {tab === 'Objectifs' && <Goals goals={data.goals} onAdd={()=>openForm('goal')} onEdit={g=>openForm('goal',g)} onDelete={id=>removeItem('goals',id)} />}
        <View style={s.footer}><Text style={s.footerText}>TES DONNÉES RESTENT SUR CET APPAREIL</Text><Text style={s.footerSub}>Version 1.0 • Mode hors connexion</Text></View>
      </ScrollView></View>
      <View style={s.tabbar}>{NAV.map(([name, icon]) => <Pressable key={name} onPress={()=>setTab(name)} style={[s.tab, tab===name && s.tabActive]}><Text style={[s.tabIcon, tab===name && {color:BLUE}]}>{icon}</Text><Text style={[s.tabLabel, tab===name && {color:WHITE}]}>{name}</Text></Pressable>)}</View>
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={()=>setModal(null)}>
        <KeyboardAvoidingView style={s.modalShade} behavior={Platform.OS==='ios'?'padding':undefined}>
          <View style={s.modalCard}>
            <View style={s.modalTop}><Text style={s.modalTitle}>{modal?.itemId?'Modifier':'Ajouter'} {modal?.kind==='task'?'une tâche':modal?.kind==='event'?'une activité':modal?.kind==='habit'?'une habitude':'un objectif'}</Text><Pressable onPress={()=>setModal(null)}><Text style={s.close}>✕</Text></Pressable></View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {(modal?.kind==='habit') ? <>
                <Label>Nom de l’habitude *</Label><Input value={form.name||''} onChangeText={v=>updateForm('name',v)} placeholder="Ex. Étirements" />
                <Label>Description</Label><Input value={form.detail||''} onChangeText={v=>updateForm('detail',v)} placeholder="Ex. 10 minutes" />
              </> : modal?.kind==='goal' ? <>
                <Label>Titre de l’objectif *</Label><Input value={form.title||''} onChangeText={v=>updateForm('title',v)} placeholder="Ex. Réviser la chimie" />
                <Label>Description / résultat attendu</Label><Input value={form.detail||''} onChangeText={v=>updateForm('detail',v)} placeholder="Décris ton objectif" />
                <Label>Cible (facultatif)</Label><Input value={form.target||''} onChangeText={v=>updateForm('target',v)} placeholder="Ex. 5 séances par semaine" />
                <Label>Progression (0 à 100)</Label><Input value={String(form.progress??'0')} onChangeText={v=>updateForm('progress',v.replace(/[^0-9]/g,''))} keyboardType="numeric" />
              </> : <>
                <Label>Titre *</Label><Input value={form.title||''} onChangeText={v=>updateForm('title',v)} placeholder={modal?.kind==='task'?'Ex. Terminer un devoir':'Ex. Révision de chimie'} />
                {modal?.kind==='task' ? <>
                  <Label>Priorité</Label><Choice values={['Basse','Moyenne','Haute']} value={form.priority||'Moyenne'} onChange={v=>updateForm('priority',v)} />
                  <Label>Catégorie</Label><Choice values={['Études','Sport','Personnel','Musique','Autre']} value={form.category||'Personnel'} onChange={v=>updateForm('category',v)} />
                  <Label>Échéance (AAAA-MM-JJ)</Label><Input value={form.date||''} onChangeText={v=>updateForm('date',v)} placeholder="2026-10-28" />
                </> : <>
                  <Label>Date (AAAA-MM-JJ)</Label><Input value={form.date||todayKey()} onChangeText={v=>updateForm('date',v)} placeholder="2026-10-28" />
                  <Label>Heure (HH:MM)</Label><Input value={form.time||'09:00'} onChangeText={v=>updateForm('time',v)} placeholder="09:00" />
                  <Label>Notes</Label><Input value={form.note||''} onChangeText={v=>updateForm('note',v)} placeholder="Détails utiles" />
                </>}
              </>}
              <Pressable style={s.primaryBtn} onPress={saveForm}><Text style={s.primaryText}>Enregistrer</Text></Pressable>
              <Pressable style={s.cancelBtn} onPress={()=>setModal(null)}><Text style={s.cancelText}>Annuler</Text></Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Home({dateLabel,tasks,events,goals,taskProgress,habitDone,habits,onTask,onAddTask,onAddEvent,onGo}) {
  const upcoming = [...events].filter(e=>!e.date||e.date>=todayKey()).sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(0,3);
  const priorities = [...goals].sort((a,b)=>Number(b.progress||0)-Number(a.progress||0)).slice(0,2);
  return <View>
    <Text style={s.eyebrow}>TON ESPACE PERSONNEL</Text><Text style={s.pageTitle}>Bonjour, prêt à avancer ?</Text><Text style={s.date}>{dateLabel}</Text>
    <View style={s.hero}><View style={s.heroTop}><View><Text style={s.heroSmall}>PROGRESSION DES TÂCHES</Text><Text style={s.heroNum}>{taskProgress}<Text style={s.percent}>%</Text></Text></View><View style={s.ring}><Text style={s.ringText}>{taskProgress}%</Text></View></View><View style={s.progressTrack}><View style={[s.progressFill,{width:`${taskProgress}%`}]}/></View><Text style={s.heroCaption}>{tasks.filter(t=>t.done).length} tâche(s) terminée(s) sur {tasks.length} pour aujourd’hui</Text></View>
    <View style={s.statsRow}><MiniStat number={String(tasks.filter(t=>!t.done).length)} label="À faire" icon="✓"/><MiniStat number={String(habitDone)} label="Habitudes" icon="↻"/><MiniStat number={String(upcoming.length)} label="À venir" icon="◷"/></View>
    <Section title="TÂCHES DU JOUR" action="Voir tout" onAction={()=>onGo('Tâches')} />
    {tasks.length===0 ? <Empty text="Aucune tâche pour aujourd’hui." button="Ajouter une tâche" onPress={onAddTask}/> : tasks.slice(0,4).map(t=><TaskRow key={t.id} item={t} onToggle={()=>onTask(t.id)}/>)}
    <Section title="OBJECTIFS PRIORITAIRES" action="Voir tout" onAction={()=>onGo('Objectifs')} />
    {priorities.length===0 ? <Empty text="Définis ce qui compte le plus pour toi." button="Créer un objectif" onPress={()=>onGo('Objectifs')}/> : priorities.map(g=><View style={s.listCard} key={g.id}><Text style={s.cardTitle}>{g.title}</Text><Text style={s.muted}>{g.detail||g.target||'Objectif personnel'}</Text><Progress value={Number(g.progress||0)}/></View>)}
    <Section title="PROCHAINS RENDEZ-VOUS" action="Planning" onAction={()=>onGo('Planning')} />
    {upcoming.length===0 ? <Empty text="Ton planning est encore libre." button="Planifier une activité" onPress={onAddEvent}/> : upcoming.map(e=><View style={s.eventRow} key={e.id}><View style={s.eventTime}><Text style={s.eventTimeText}>{e.time||'--:--'}</Text></View><View style={{flex:1}}><Text style={s.cardTitle}>{e.title}</Text><Text style={s.muted}>{e.date||'Date à définir'}</Text></View><Text style={s.eventDot}>●</Text></View>)}
    <Pressable style={s.secondaryBtn} onPress={()=>onGo('Habitudes')}><Text style={s.secondaryText}>Suivre mes habitudes  →</Text></Pressable>
  </View>;
}
function Planning({events,onAdd,onEdit,onDelete,onReminder}) {
  const sorted=[...events].sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||''));
  return <View><Text style={s.eyebrow}>ORGANISATION</Text><Text style={s.pageTitle}>Planning</Text><Text style={s.mutedBlock}>Vue chronologique des activités enregistrées. Utilise les dates pour organiser ta semaine.</Text>
    <Pressable style={s.primaryBtn} onPress={onAdd}><Text style={s.primaryText}>＋ Ajouter une activité</Text></Pressable>
    <Pressable style={s.secondaryBtn} onPress={onReminder}><Text style={s.secondaryText}>◷ Activer un rappel quotidien</Text></Pressable>
    {sorted.length===0?<Empty text="Aucune activité planifiée pour le moment."/>:sorted.map(e=><Pressable key={e.id} onPress={()=>onEdit(e)} style={s.listCard}><View style={s.rowBetween}><Text style={s.cardTitle}>{e.title}</Text><Text style={s.pill}>{e.time||'--:--'}</Text></View><Text style={s.muted}>{e.date||'Date à définir'} {e.note?`• ${e.note}`:''}</Text><View style={s.rowEnd}><Text style={s.editText}>Modifier</Text><Text onPress={()=>onDelete(e.id)} style={s.deleteText}>Supprimer</Text></View></Pressable>)}
    <Text style={s.smallNote}>Note : le rappel proposé est une notification quotidienne générale. Les rappels par activité nécessitent une programmation dédiée.</Text>
  </View>;
}
function Tasks({tasks,onAdd,onEdit,onToggle,onDelete}) {
  const [filter,setFilter]=useState('Toutes');
  const filtered=tasks.filter(t=>filter==='Toutes'||(filter==='Terminées'?t.done:!t.done)).sort((a,b)=>priorityRank(b.priority)-priorityRank(a.priority));
  return <View><Text style={s.eyebrow}>PASSER À L’ACTION</Text><Text style={s.pageTitle}>Mes tâches</Text><View style={s.filters}>{['Toutes','À faire','Terminées'].map(f=><Pressable key={f} onPress={()=>setFilter(f)} style={[s.filter,filter===f&&s.filterOn]}><Text style={[s.filterText,filter===f&&s.filterTextOn]}>{f}</Text></Pressable>)}</View>
    <Pressable style={s.primaryBtn} onPress={onAdd}><Text style={s.primaryText}>＋ Nouvelle tâche</Text></Pressable>
    {filtered.length===0?<Empty text="Aucune tâche dans cette liste. Ajoute une tâche pour commencer."/>:filtered.map(t=><View key={t.id} style={s.listCard}><TaskRow item={t} onToggle={()=>onToggle(t.id)}/><Text style={s.muted}>{t.category||'Personnel'} • Échéance : {t.date||'Non définie'}</Text><View style={s.rowEnd}><Text onPress={()=>onEdit(t)} style={s.editText}>Modifier</Text><Text onPress={()=>onDelete(t.id)} style={s.deleteText}>Supprimer</Text></View></View>)}
  </View>;
}
function Habits({habits,onAdd,onEdit,onToggle,onDelete}) {
  return <View><Text style={s.eyebrow}>PETITS GESTES, GRANDS PROGRÈS</Text><Text style={s.pageTitle}>Mes habitudes</Text><Text style={s.mutedBlock}>Coche les habitudes réalisées aujourd’hui. La remise à zéro automatique par jour sera ajoutée dans une prochaine version.</Text>
    <View style={s.hero}><Text style={s.heroSmall}>HABITUDES VALIDÉES</Text><Text style={s.heroNum}>{habits.filter(h=>h.done).length}<Text style={s.percent}> / {habits.length}</Text></Text><Progress value={habits.length?habits.filter(h=>h.done).length/habits.length*100:0}/></View>
    <Pressable style={s.primaryBtn} onPress={onAdd}><Text style={s.primaryText}>＋ Ajouter une habitude</Text></Pressable>
    {habits.map(h=><View style={s.listCard} key={h.id}><Pressable onPress={()=>onToggle(h.id)} style={s.habitRow}><View style={[s.checkbox,h.done&&s.checkboxOn]}>{h.done&&<Text style={s.checkMark}>✓</Text>}</View><View style={{flex:1}}><Text style={[s.cardTitle,h.done&&s.strike]}>{h.name}</Text><Text style={s.muted}>{h.detail||'Habitude quotidienne'}</Text></View><Text style={s.muted}>›</Text></Pressable><View style={s.rowEnd}><Text onPress={()=>onEdit(h)} style={s.editText}>Modifier</Text><Text onPress={()=>onDelete(h.id)} style={s.deleteText}>Supprimer</Text></View></View>)}
  </View>;
}
function Goals({goals,onAdd,onEdit,onDelete}) {
  return <View><Text style={s.eyebrow}>GARDER LE CAP</Text><Text style={s.pageTitle}>Mes objectifs</Text><Text style={s.mutedBlock}>Définis un résultat clair et mets à jour manuellement ta progression.</Text><Pressable style={s.primaryBtn} onPress={onAdd}><Text style={s.primaryText}>＋ Créer un objectif</Text></Pressable>
    {goals.length===0?<Empty text="Aucun objectif enregistré. Commence par un objectif simple et réaliste."/>:goals.map(g=><View style={s.listCard} key={g.id}><View style={s.rowBetween}><Text style={s.cardTitle}>{g.title}</Text><Text style={s.pill}>{Math.min(100,Number(g.progress||0))}%</Text></View>{g.detail?<Text style={s.muted}>{g.detail}</Text>:null}{g.target?<Text style={s.goalTarget}>Cible : {g.target}</Text>:null}<Progress value={Math.min(100,Number(g.progress||0))}/><View style={s.rowEnd}><Text onPress={()=>onEdit(g)} style={s.editText}>Mettre à jour</Text><Text onPress={()=>onDelete(g.id)} style={s.deleteText}>Supprimer</Text></View></View>)}
  </View>;
}
function priorityRank(p){return p==='Haute'?3:p==='Moyenne'?2:1;}
function TaskRow({item,onToggle}) {return <View style={s.taskRow}><Pressable onPress={onToggle} style={[s.checkbox,item.done&&s.checkboxOn]}>{item.done&&<Text style={s.checkMark}>✓</Text>}</Pressable><View style={{flex:1}}><Text style={[s.cardTitle,item.done&&s.strike]}>{item.title}</Text><Text style={s.muted}>{item.priority||'Moyenne'} priorité {item.date?`• ${item.date}`:''}</Text></View><View style={[s.priorityDot,{backgroundColor:item.priority==='Haute'?'#FF667D':item.priority==='Basse'?'#4DD6A0':'#F4BC57'}]}/></View>}
function MiniStat({number,label,icon}){return <View style={s.miniStat}><Text style={s.statIcon}>{icon}</Text><Text style={s.statNumber}>{number}</Text><Text style={s.statLabel}>{label}</Text></View>}
function Section({title,action,onAction}){return <View style={s.sectionHead}><Text style={s.sectionTitle}>{title}</Text>{action&&<Text onPress={onAction} style={s.sectionAction}>{action} ↗</Text>}</View>}
function Empty({text,button,onPress}){return <View style={s.empty}><Text style={s.emptyIcon}>◇</Text><Text style={s.emptyText}>{text}</Text>{button&&<Pressable onPress={onPress} style={s.emptyBtn}><Text style={s.emptyBtnText}>{button}</Text></Pressable>}</View>}
function Progress({value}){const v=Math.max(0,Math.min(100,Number(value)||0));return <View style={s.progressTrack}><View style={[s.progressFill,{width:`${v}%`}]}/></View>}
function Label({children}){return <Text style={s.inputLabel}>{children}</Text>}
function Input(props){return <TextInput placeholderTextColor="#65728A" {...props} style={[s.input,props.style]} />}
function Choice({values,value,onChange}){return <View style={s.choices}>{values.map(v=><Pressable key={v} onPress={()=>onChange(v)} style={[s.choice,value===v&&s.choiceOn]}><Text style={[s.choiceText,value===v&&s.choiceTextOn]}>{v}</Text></Pressable>)}</View>}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:BG,paddingTop:Platform.OS==='android'?StatusBar.currentHeight||0:0},
 header:{height:70,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#141B29'},
 brand:{color:WHITE,fontSize:17,fontWeight:'900',letterSpacing:1.2},tagline:{color:MUTED,fontSize:9,letterSpacing:2,marginTop:4,fontWeight:'700'},
 avatar:{height:38,width:38,borderRadius:14,backgroundColor:'#14294B',borderWidth:1,borderColor:'#2857A0',alignItems:'center',justifyContent:'center'},avatarText:{color:'#77A8FF',fontWeight:'900'},
 main:{flex:1},loading:{color:WHITE,fontSize:22,fontWeight:'900',margin:24,marginTop:70},muted:{color:MUTED,fontSize:12,lineHeight:18},mutedBlock:{color:MUTED,fontSize:13,lineHeight:20,marginBottom:18},
 tabbar:{height:68,backgroundColor:'#0D121D',borderTopWidth:1,borderTopColor:LINE,flexDirection:'row',paddingBottom:Platform.OS==='ios'?12:4,paddingTop:7},
 tab:{flex:1,alignItems:'center',justifyContent:'center',borderRadius:12,marginHorizontal:3},tabActive:{backgroundColor:'#14213A'},tabIcon:{fontSize:20,color:'#71809A',fontWeight:'700'},tabLabel:{fontSize:9,color:'#77849B',marginTop:3,fontWeight:'700'},
 eyebrow:{color:BLUE,fontSize:10,fontWeight:'900',letterSpacing:2,marginTop:23,marginBottom:7},pageTitle:{color:WHITE,fontSize:27,fontWeight:'900',letterSpacing:-.6},date:{color:MUTED,fontSize:12,marginTop:7,marginBottom:18,textTransform:'capitalize'},
 hero:{backgroundColor:'#111C31',borderWidth:1,borderColor:'#1C3155',borderRadius:22,padding:18,marginTop:4,marginBottom:14},heroTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},heroSmall:{color:'#9CB6E5',fontSize:10,fontWeight:'800',letterSpacing:1.3},heroNum:{color:WHITE,fontSize:38,fontWeight:'900',marginTop:6},percent:{fontSize:18,color:'#8FA4C7'},ring:{width:66,height:66,borderRadius:33,borderWidth:5,borderColor:BLUE,alignItems:'center',justifyContent:'center',backgroundColor:'#0B1424'},ringText:{color:WHITE,fontWeight:'900',fontSize:12},progressTrack:{height:7,backgroundColor:'#253047',borderRadius:10,overflow:'hidden',marginTop:13},progressFill:{height:'100%',backgroundColor:BLUE,borderRadius:10},heroCaption:{color:'#A9B8D0',fontSize:11,marginTop:9},
 statsRow:{flexDirection:'row',gap:9,marginBottom:20},miniStat:{flex:1,backgroundColor:CARD,borderWidth:1,borderColor:LINE,borderRadius:17,padding:13},statIcon:{color:BLUE,fontSize:16},statNumber:{color:WHITE,fontSize:23,fontWeight:'900',marginTop:7},statLabel:{color:MUTED,fontSize:10,marginTop:2},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:11,marginBottom:10},sectionTitle:{color:'#B5C2D8',fontSize:10,fontWeight:'900',letterSpacing:1.2},sectionAction:{color:'#6FA0FF',fontSize:11,fontWeight:'700'},
 listCard:{backgroundColor:CARD,borderWidth:1,borderColor:LINE,borderRadius:17,padding:14,marginBottom:10},cardTitle:{color:WHITE,fontSize:14,fontWeight:'800',marginBottom:4},taskRow:{flexDirection:'row',alignItems:'center',gap:11,paddingVertical:5},checkbox:{height:22,width:22,borderRadius:7,borderWidth:1.5,borderColor:'#53627B',alignItems:'center',justifyContent:'center'},checkboxOn:{backgroundColor:BLUE,borderColor:BLUE},checkMark:{color:WHITE,fontWeight:'900',fontSize:13},strike:{textDecorationLine:'line-through',color:'#78849A'},priorityDot:{width:7,height:7,borderRadius:4,marginHorizontal:3},rowBetween:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},rowEnd:{flexDirection:'row',justifyContent:'flex-end',gap:18,marginTop:12},editText:{color:'#7EAAFF',fontSize:11,fontWeight:'800'},deleteText:{color:'#FF7788',fontSize:11,fontWeight:'800'},pill:{color:'#91B6FF',backgroundColor:'#192C4B',paddingHorizontal:9,paddingVertical:5,borderRadius:8,fontSize:10,fontWeight:'800'},
 eventRow:{flexDirection:'row',alignItems:'center',gap:12,padding:13,backgroundColor:CARD,borderRadius:15,marginBottom:8,borderWidth:1,borderColor:LINE},eventTime:{backgroundColor:'#172A48',padding:9,borderRadius:10},eventTimeText:{color:'#8DB3FF',fontSize:12,fontWeight:'900'},eventDot:{color:BLUE,fontSize:11},
 secondaryBtn:{borderWidth:1,borderColor:'#294A7E',borderRadius:14,padding:14,alignItems:'center',marginTop:7,marginBottom:12,backgroundColor:'#0D1729'},secondaryText:{color:'#9EC0FF',fontSize:12,fontWeight:'800'},
 primaryBtn:{backgroundColor:BLUE,borderRadius:14,padding:15,alignItems:'center',marginTop:10,marginBottom:10},primaryText:{color:WHITE,fontSize:13,fontWeight:'900'},cancelBtn:{padding:14,alignItems:'center',marginBottom:8},cancelText:{color:MUTED,fontSize:13,fontWeight:'700'},
 empty:{alignItems:'center',padding:22,borderRadius:17,borderWidth:1,borderColor:LINE,borderStyle:'dashed',marginBottom:12},emptyIcon:{color:'#426CB0',fontSize:24},emptyText:{color:MUTED,fontSize:12,textAlign:'center',lineHeight:18,marginTop:8},emptyBtn:{marginTop:12,paddingHorizontal:13,paddingVertical:9,borderRadius:10,backgroundColor:'#172A48'},emptyBtnText:{color:'#A9C7FF',fontSize:11,fontWeight:'800'},
 filters:{flexDirection:'row',gap:8,marginTop:17,marginBottom:8},filter:{borderWidth:1,borderColor:LINE,borderRadius:10,paddingHorizontal:13,paddingVertical:8},filterOn:{backgroundColor:'#162B4D',borderColor:'#315D9F'},filterText:{color:MUTED,fontSize:11,fontWeight:'700'},filterTextOn:{color:'#A7C6FF'},
 habitRow:{flexDirection:'row',alignItems:'center',gap:12},goalTarget:{color:'#A5B4CC',fontSize:11,marginTop:5},smallNote:{color:'#6F7D95',fontSize:10,lineHeight:16,marginTop:10,marginBottom:10},footer:{alignItems:'center',paddingVertical:20,marginTop:10},footerText:{color:'#64718A',fontSize:8,fontWeight:'900',letterSpacing:1.4},footerSub:{color:'#47536A',fontSize:9,marginTop:5},
 modalShade:{flex:1,backgroundColor:'rgba(0,0,0,0.72)',justifyContent:'flex-end'},modalCard:{backgroundColor:'#0D1320',borderTopLeftRadius:26,borderTopRightRadius:26,borderWidth:1,borderColor:LINE,padding:20,maxHeight:'90%'},modalTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18},modalTitle:{color:WHITE,fontSize:18,fontWeight:'900',flex:1},close:{color:MUTED,fontSize:20,paddingHorizontal:5},inputLabel:{color:'#AEBBD0',fontSize:11,fontWeight:'800',marginTop:12,marginBottom:7},input:{backgroundColor:'#111A2A',borderWidth:1,borderColor:'#29354A',borderRadius:12,color:WHITE,paddingHorizontal:13,paddingVertical:12,fontSize:13},choices:{flexDirection:'row',gap:7,flexWrap:'wrap'},choice:{borderWidth:1,borderColor:LINE,borderRadius:10,paddingHorizontal:12,paddingVertical:9},choiceOn:{borderColor:BLUE,backgroundColor:'#152B4D'},choiceText:{color:MUTED,fontSize:11},choiceTextOn:{color:'#A9C9FF',fontWeight:'800'}
});
