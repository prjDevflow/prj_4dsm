# Modelo de dados v1

> Gerado por `npm run db:erd` a partir de `prisma/schema.prisma`. Não edite à mão: rode o comando
> de novo depois de mudar o schema (um teste falha se este arquivo ficar desatualizado).

## Diagrama

```mermaid
erDiagram
  users {
    uuid id PK
    varchar(120) nome
    varchar(254) email UK
    varchar(100) senhaHash
    perfil perfil
    boolean ativo
    timestamptz(3) criadoEm
    timestamptz(3) atualizadoEm
  }
  buildings {
    uuid id PK
    varchar(120) nome
    varchar(255) endereco
    float latitude
    float longitude
    boolean ativo
  }
  access_points {
    uuid id PK
    uuid buildingId FK
    access_point_tipo tipo
    varchar(120) nome
    varchar(60) identificacao
    float latitude
    float longitude
    boolean ativo
  }
  terminals {
    uuid id PK
    uuid accessPointId FK, UK
    varchar(120) nome
    varchar(64) apiKeyHash
    boolean ativo
    timestamptz(3) ultimoContatoEm "opcional"
    float ultimaLat "opcional"
    float ultimaLon "opcional"
    boolean gpsFix
    boolean gpsSimulado
    varchar(40) firmware "opcional"
    int rssi "opcional"
    uuid modoCadastroUsuarioId FK "opcional"
    timestamptz(3) modoCadastroAte "opcional"
  }
  authorizations {
    uuid id PK
    uuid usuarioId FK
    uuid accessPointId FK
    date dataInicio
    date dataFim
    varchar(5) horaInicio
    varchar(5) horaFim
    int usosPermitidos
    int usosRealizados
    authorization_situacao situacao
    uuid criadoPorId FK
    timestamptz(3) criadoEm
    uuid canceladoPorId FK "opcional"
    timestamptz(3) canceladoEm "opcional"
    varchar(500) motivoCancelamento "opcional"
  }
  nfc_tags {
    uuid id PK
    uuid usuarioId FK
    varchar(20) uid UK
    varchar(120) descricao "opcional"
    boolean ativa
    timestamptz(3) criadaEm
  }
  qr_credentials {
    uuid id PK
    uuid terminalId FK
    varchar(64) tokenHash UK
    timestamptz(3) emitidoEm
    timestamptz(3) expiraEm
    timestamptz(3) consumidoEm "opcional"
    uuid consumidoPorId FK "opcional"
  }
  terminal_commands {
    int id PK
    uuid terminalId FK
    command_tipo tipo
    varchar(60) motivo "opcional"
    int aberturaMs "opcional"
    timestamptz(3) criadoEm
    timestamptz(3) expiraEm
    timestamptz(3) entregueEm "opcional"
    timestamptz(3) executadoEm "opcional"
  }
  access_events {
    uuid id PK
    timestamptz(3) ocorridoEm
    uuid terminalId FK "opcional"
    uuid accessPointId FK "opcional"
    uuid usuarioId FK "opcional"
    uuid authorizationId FK "opcional"
    event_metodo metodo
    event_resultado resultado
    varchar(60) motivo "opcional"
    float distanciaM "opcional"
    varchar(100) clientEventId UK "opcional"
    jsonb detalhes "opcional"
  }
  buildings ||--o{ access_points : "buildingId"
  access_points ||--o| terminals : "accessPointId"
  users |o--o{ terminals : "modoCadastroUsuarioId"
  users ||--o{ authorizations : "usuarioId"
  access_points ||--o{ authorizations : "accessPointId"
  users ||--o{ authorizations : "criadoPorId"
  users |o--o{ authorizations : "canceladoPorId"
  users ||--o{ nfc_tags : "usuarioId"
  terminals ||--o{ qr_credentials : "terminalId"
  users |o--o{ qr_credentials : "consumidoPorId"
  terminals ||--o{ terminal_commands : "terminalId"
  terminals |o--o{ access_events : "terminalId"
  access_points |o--o{ access_events : "accessPointId"
  users |o--o{ access_events : "usuarioId"
  authorizations |o--o{ access_events : "authorizationId"
```

Legenda: `PK` chave primária, `FK` chave estrangeira, `UK` valor único, `"opcional"` aceita nulo.
Toda chave estrangeira é `ON DELETE RESTRICT`: registros são desativados (`ativo`), nunca apagados.

## Enums

| Tipo no banco | Valores |
| --- | --- |
| `perfil` | ADMIN, CONDOMINO, VISITANTE |
| `access_point_tipo` | PORTARIA, PORTA, CATRACA |
| `authorization_situacao` | ATIVA, CANCELADA |
| `command_tipo` | ABRIR, NEGAR |
| `event_metodo` | QR, NFC |
| `event_resultado` | AUTORIZADO, NEGADO |

## Restrições que não aparecem no diagrama

Os `CHECK` (usos e datas da autorização, formato de horas, coordenadas, formato de UID de NFC,
validade de QR e de comando, e o formato de bcrypt e SHA-256 dos hashes) não existem no Prisma.
Ficam em SQL no fim de `prisma/migrations/*_modelo_de_dados_v1/migration.sql`, com nomes no padrão
`<tabela>_<regra>_chk`.
