// ════════════════════════════════════════════════════════════════════════════════
// ADIÇÕES AO APP.JSX PARA IMPLEMENTAR RBAC E SUB19 COACH
// ════════════════════════════════════════════════════════════════════════════════

// 1. ADICIONE NO TOPO DO APP (após imports, antes de "function App")
// ────────────────────────────────────────────────────────────────────────────

async function getUserRole(userId) {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', userId)
      .single();
    if (error) {
      console.warn('Erro ao buscar role:', error);
      return 'athlete'; // Default
    }
    return data?.role || 'athlete';
  } catch (e) {
    console.error(e);
    return 'athlete';
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 2. DENTRO DE "function App()", APÓS useState(athletes, ...)
// ────────────────────────────────────────────────────────────────────────────

  const [userRole, setUserRole] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('Sub19'); // Para Matias editar Sub19

  useEffect(() => {
    // Carregar role do usuário ao iniciar
    const session = localStorage.getItem('sb-session');
    if (session) {
      const userData = JSON.parse(session);
      const userId = userData.user?.id;
      if (userId) {
        getUserRole(userId).then(role => setUserRole(role));
      }
    }
  }, []);

// ────────────────────────────────────────────────────────────────────────────
// 3. SUBSTITUIR O SELETOR DE ATLETA (no bloco de admin)
// ────────────────────────────────────────────────────────────────────────────

{isAdmin && (
  <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
    <div>
      <Lbl style={{display:"block",marginBottom:6}}>👤 Atleta</Lbl>
      <select value={selectedAthleteId} onChange={e=>setSelectedAthleteId(e.target.value)}
        style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"8px 28px 8px 10px",borderRadius:6,outline:"none"}}>
        <option value="">— Selecione —</option>
        {athletes
          .filter(a => {
            // Se é Sub19 coach, filtra apenas Sub19
            if (userRole === 'sub19_coach') {
              return a.athlete_category === 'Sub19';
            }
            // Admin vê todos
            return true;
          })
          .map(a=><option key={a.id} value={a.id}>{a.name}</option>)
        }
      </select>
    </div>

    {/* Mostrar seletor de categoria apenas para Admin (não Sub19 coach) */}
    {userRole === 'admin' && (
      <div>
        <Lbl style={{display:"block",marginBottom:6}}>📊 Filtrar por Categoria</Lbl>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}
          style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,background:C.bg,border:`1.5px solid ${C.border}`,color:C.text,padding:"8px 28px 8px 10px",borderRadius:6,outline:"none"}}>
          <option value="">Todos</option>
          <option value="Sub19">Sub19</option>
          <option value="Sub23">Sub23</option>
          <option value="Sênior">Sênior</option>
          <option value="ParaRemo">ParaRemo</option>
        </select>
      </div>
    )}
  </div>
)}

// ────────────────────────────────────────────────────────────────────────────
// 4. NO PAINEL ADMIN (tabs), ESCONDER ABAS PARA SUB19_COACH
// ────────────────────────────────────────────────────────────────────────────

{isAdmin && (
  <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,gap:0,marginBottom:16}}>
    {/* Mostrar todas as abas para Admin */}
    {userRole === 'admin' && (
      <>
        <button onClick={()=>setAdminTab('Dashboard')} style={{...tabStyle('Dashboard')}}>{tabs[0]}</button>
        <button onClick={()=>setAdminTab('Treinos')} style={{...tabStyle('Treinos')}}>{tabs[1]}</button>
        <button onClick={()=>setAdminTab('Atletas')} style={{...tabStyle('Atletas')}}>{tabs[2]}</button>
        <button onClick={()=>setAdminTab('Bem-Estar')} style={{...tabStyle('Bem-Estar')}}>{tabs[3]}</button>
        <button onClick={()=>setAdminTab('Musculação')} style={{...tabStyle('Musculação')}}>{tabs[4]}</button>
        <button onClick={()=>setAdminTab('Step Test')} style={{...tabStyle('Step Test')}}>{tabs[5]}</button>
        <button onClick={()=>setAdminTab('Best Times')} style={{...tabStyle('Best Times')}}>{tabs[6]}</button>
      </>
    )}

    {/* Sub19 coach vê apenas Musculação, Bem-Estar e Ranking */}
    {userRole === 'sub19_coach' && (
      <>
        <button onClick={()=>setAdminTab('Musculação')} style={{...tabStyle('Musculação')}}>🏋️ Musculação</button>
        <button onClick={()=>setAdminTab('Bem-Estar')} style={{...tabStyle('Bem-Estar')}}>💚 Bem-Estar</button>
        <button onClick={()=>setAdminTab('Ranking')} style={{...tabStyle('Ranking')}}>🏆 Ranking</button>
      </>
    )}
  </div>
)}

// ────────────────────────────────────────────────────────────────────────────
// 5. NO RANKING (Gym Module), FILTRAR ATLETAS PARA SUB19_COACH
// ────────────────────────────────────────────────────────────────────────────

// Dentro de GymRanking (ou similar):
{adminTab === 'Ranking' && (
  <GymRanking 
    athletes={athletes.filter(a => 
      userRole === 'sub19_coach' ? a.athlete_category === 'Sub19' : true
    )}
    records={gymRecords}
    exercises={gymExercises}
  />
)}

// ────────────────────────────────────────────────────────────────────────────
// 6. ATUALIZAR FUNÇÃO fetchAthletes PARA INCLUIR athlete_category
// ────────────────────────────────────────────────────────────────────────────

async function fetchAthletes() {
  try {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .order('name');
    if (error) throw error;
    // Adicionar categoria padrão se não existir
    const withCategory = data.map(a => ({
      ...a,
      athlete_category: a.athlete_category || 'Sênior'
    }));
    setAthletes(withCategory);
  } catch (e) {
    console.error('Erro ao buscar atletas:', e.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// RESUMO DE MUDANÇAS
// ════════════════════════════════════════════════════════════════════════════════

/*
✅ 1. Adicionar função getUserRole() no topo
✅ 2. Adicionar useState(userRole) e useState(categoryFilter) em App()
✅ 3. Adicionar useEffect para carregar role ao iniciar
✅ 4. Substituir seletor de atleta com filtro de role
✅ 5. Adicionar seletor de categoria (visível apenas para admin)
✅ 6. Esconder/mostrar abas conforme role
✅ 7. Filtrar atletas no Ranking para Sub19 coach
✅ 8. Atualizar fetchAthletes para incluir athlete_category

RESULTADO FINAL:
- Admin (Alê) vê TUDO
- Sub19 Coach (Matias) vê apenas atletas Sub19, edita musculação/bem-estar deles
- Atletas veem apenas seus próprios dados
- Ranking é GERAL (todos veem e editam)
- Sub19 aparece no ranking com seus best times próprios
*/
