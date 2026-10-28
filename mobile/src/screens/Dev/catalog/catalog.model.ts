import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui';
import type { Scale } from '@/theme';

// Demo state of the component catalog (development only): every component with live values.

const PERFIS = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'CONDOMINO', label: 'Condômino' },
  { value: 'VISITANTE', label: 'Visitante' },
];

const LOCAIS = [
  { value: 'social', label: 'Catraca Social', description: 'Edifício Central' },
  { value: 'garagem', label: 'Porta da Garagem', description: 'Edifício Central' },
  { value: 'portaria', label: 'Portaria', description: 'Edifício Norte' },
  { value: 'academia', label: 'Academia', description: 'Edifício Norte' },
];

const FILTROS = ['Todos', 'Administrador', 'Condômino', 'Visitante'];

const SAVE_DEMO_MS = 2000;

export const useCatalogModel = () => {
  const toast = useToast();
  const [scale, setScale] = useState<Scale>('pessoa');
  const [nome, setNome] = useState('Maria Souza');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState<string | null>('CONDOMINO');
  const [local, setLocal] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState<string | null>('2026-10-20');
  const [horaInicio, setHoraInicio] = useState<string | null>('08:00');
  const [entradas, setEntradas] = useState(3);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [filtro, setFiltro] = useState(FILTROS[0]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onSave = () =>
    new Promise<void>((resolve) => {
      setSaving(true);
      timer.current = setTimeout(() => {
        setSaving(false);
        resolve();
      }, SAVE_DEMO_MS);
    });

  return {
    scale,
    onToggleAdmin: (admin: boolean) => setScale(admin ? 'admin' : 'pessoa'),
    nome: {
      value: nome,
      onChangeText: setNome,
      error: nome.trim().length < 3 ? 'Informe o nome completo (mínimo 3 letras).' : undefined,
    },
    email: { value: email, onChangeText: setEmail },
    senha: { value: senha, onChangeText: setSenha },
    perfil: { options: PERFIS, value: perfil, onChange: setPerfil },
    local: { options: LOCAIS, value: local, onChange: setLocal },
    dataInicio: { value: dataInicio, onChange: setDataInicio },
    horaInicio: { value: horaInicio, onChange: setHoraInicio },
    entradas: { value: entradas, min: 1, max: 10, onChange: setEntradas },
    mostrarInativos: { value: mostrarInativos, onValueChange: setMostrarInativos },
    filtros: FILTROS,
    filtro,
    onSelectFiltro: setFiltro,
    saving,
    onSave,
    onShowToast: () => toast.show('Autorização criada.'),
    dialog: {
      visible: dialogVisible,
      onOpen: () => setDialogVisible(true),
      onCancel: () => setDialogVisible(false),
      onConfirm: () => {
        setDialogVisible(false);
        toast.show('Autorização cancelada.');
      },
    },
  };
};
