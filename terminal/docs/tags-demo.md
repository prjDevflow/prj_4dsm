# Tags da demonstração

UIDs lidos pelo terminal em 07/11/2026 (firmware 0.2.0), no formato do contrato: hexadecimal maiúsculo, sem
separadores. O administrador vincula cada tag a um usuário no app (F13) digitando o UID.

| Tag | UID | Observação |
|---|---|---|
| Cartão branco do kit RC522 | `4E7BBB06` | MIFARE Classic 1K, UID de 4 bytes |
| Chaveiro do kit RC522 | `3414D806` | UID de 4 bytes |

O terminal mostra "Tag lida..." com o UID por 2 s e escreve `UID: ...` na serial a cada leitura: é o jeito
mais rápido de descobrir o UID de uma tag nova.
