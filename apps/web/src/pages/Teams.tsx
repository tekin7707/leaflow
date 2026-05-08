import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { Card, SectionLabel, Button, Pill, Avatar, Empty } from '../components/UI';

export default function Teams() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/api/teams') });
  const usersQ = useQuery({
    queryKey: ['users-search', search],
    queryFn: () => api.get(`/api/teams/users/search?q=${encodeURIComponent(search)}`),
  });

  const teams = teamsQ.data || [];
  const team = teams.find((t) => t.id === selected) || teams[0];

  const addMember = useMutation({
    mutationFn: ({ teamId, userId, role }) =>
      api.post(`/api/teams/${teamId}/members`, { userId, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
  const removeMember = useMutation({
    mutationFn: ({ teamId, userId }) =>
      api.del(`/api/teams/${teamId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
  const setRole = useMutation({
    mutationFn: ({ teamId, userId, role }) =>
      api.post(`/api/teams/${teamId}/members/${userId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
  const create = useMutation({
    mutationFn: (data) => api.post('/api/teams', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });

  return (
    <div>
      <SectionLabel>Takımlar</SectionLabel>
      <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: '0 0 20px' }}>
        Takım yönetimi
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <Card>
          <SectionLabel>Takımlar</SectionLabel>
          <div className="list">
            {teams.map((t) => (
              <div
                key={t.id}
                className={`list-item ${team?.id === t.id ? 'active' : ''}`}
                onClick={() => setSelected(t.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>{t.code}</div>
                </div>
                <Pill>{t.members.length} üye</Pill>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            style={{ marginTop: 12, width: '100%' }}
            onClick={() => {
              const name = prompt('Takım adı?');
              if (!name) return;
              const code = prompt('Takım kodu (kebab-case)?');
              if (!code) return;
              create.mutate({ name, code });
            }}
          >
            + Yeni takım
          </Button>
        </Card>

        <Card>
          {!team && <Empty>Takım seçin</Empty>}
          {team && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <h2 className="h-serif" style={{ margin: 0, fontSize: 28, fontStyle: 'italic' }}>{team.name}</h2>
                <span className="mono muted" style={{ fontSize: 11 }}>{team.code}</span>
              </div>
              <SectionLabel>Üyeler ({team.members.length})</SectionLabel>
              <div className="list">
                {team.members.map((m) => (
                  <div key={m.id} className="list-item">
                    <Avatar name={m.user.displayName} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{m.user.displayName}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{m.user.email}</div>
                    </div>
                    <Pill tone={m.role === 'MANAGER' ? 'accent' : 'mute'}>{m.role}</Pill>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setRole.mutate({
                          teamId: team.id,
                          userId: m.userId,
                          role: m.role === 'MANAGER' ? 'MEMBER' : 'MANAGER',
                        })
                      }
                    >
                      {m.role === 'MANAGER' ? 'Üye yap' : 'Yönetici yap'}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeMember.mutate({ teamId: team.id, userId: m.userId })}
                    >
                      Çıkar
                    </Button>
                  </div>
                ))}
              </div>

              <SectionLabel>Üye ekle</SectionLabel>
              <input
                type="search"
                value={search}
                placeholder="Kullanıcı ara…"
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
              />
              <div className="list">
                {(usersQ.data || [])
                  .filter((u) => !team.members.find((m) => m.userId === u.id))
                  .slice(0, 10)
                  .map((u) => (
                    <div key={u.id} className="list-item">
                      <Avatar name={u.displayName} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{u.email}</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addMember.mutate({ teamId: team.id, userId: u.id, role: 'MEMBER' })}
                      >
                        + Ekle
                      </Button>
                    </div>
                  ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
