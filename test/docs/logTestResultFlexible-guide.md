# logTestResult - Guia d'Ús

La funció `logTestResult` permet registrar resultats de tests de forma estandarditzada però flexible, adaptant-se a diferents tipus de tests.

## Signatura

```javascript
logTestResult(testFileName, testName, inputOrOptions, outcome, resultOrError = null)
```

## Paràmetres

- **`testFileName`**: Nom del fitxer de test (ex: `'utils.test.js'`)
- **`testName`**: Nom del test específic (ex: `'Redact accessToken field'`)
- **`inputOrOptions`**: Per tests MCP tools: objecte input. Per altres tests: objecte options
- **`outcome`**: Resultat del test (`'ok'`, `'ko'`, `'skipped'`)
- **`resultOrError`**: Resultat de l'eina MCP (per `'ok'`) o missatge d'error (per `'ko'/'skipped'`)

## Opcions Disponibles

| Opció | Tipus | Descripció |
|-------|-------|------------|
| `input` | `object` | **Paràmetres de l'eina MCP** (per tests de tools) |
| `output` | `object\|string` | **Resultats del test** (per tests no-MCP) |
| `result` | `object` | Resultat complet de l'eina MCP (opcional) |
| `errorMessage` | `string` | Missatge d'error (per `'ko'`) |
| `skipReason` | `string` | Raó per saltar (per `'skipped'`) |
| `description` | `string` | Descripció addicional del test |

## ⚠️ Important: Quan Usar Input/Output

### **Tests de Tools MCP** (`test/tools/`)
**✅ Correcte** - Mostrar paràmetres de l'eina:
```javascript
logTestResult('executeSoqlQuery.test.js', 'Basic query', { query }, 'ok', result)
```

### **Tests NO de Tools** (servidor, unitats, etc.)
**✅ Correcte** - Només descripció:
```javascript
logTestResult('server-startup.test.js', 'Start MCP server', {
    description: 'Tests that MCP server starts successfully'
}, 'ok')
```

**❌ Incorrecte** - Forçar inputs/outputs artificials:
```javascript
logTestResult('server-startup.test.js', 'Start MCP server', {
    input: { testType: 'server startup' },  // ← No té sentit
    output: { serverStarted: true }          // ← No és un input/output real
}, 'ok')
```

## Exemples d'Ús

### 1. Test de Unitat Simple

```javascript
it('should multiply numbers', () => {
    const input = { a: 5, b: 2 }
    const result = multiply(input.a, input.b)

    logTestResultFlexible('math.test.js', 'Multiply numbers', 'ok', {
        input,
        output: `Result: ${result}`,
        description: 'Tests basic multiplication'
    })

    expect(result).toBe(10)
})
```

**Sortida:**
```
TEST RESULT FOR math.test.js: Multiply numbers

DESCRIPTION: Tests basic multiplication

OUTCOME:
    ✓ PASS

INPUT:
    {
      a: 5,
      b: 2
    }

OUTPUT:
    Result: 10
```

### 2. Test amb Error

```javascript
it('should handle division by zero', () => {
    const input = { a: 10, b: 0 }

    try {
        const result = divide(input.a, input.b)
        logTestResultFlexible('math.test.js', 'Divide by zero', 'ok', {
            input,
            output: `Result: ${result}`
        })
    } catch (error) {
        logTestResultFlexible('math.test.js', 'Divide by zero', 'ko', {
            input,
            errorMessage: error.message,
            description: 'Tests error handling for division by zero'
        })
        throw error
    }
})
```

**Sortida:**
```
TEST RESULT FOR math.test.js: Divide by zero

DESCRIPTION: Tests error handling for division by zero

OUTCOME:
    ✗ FAIL
    Error: Cannot divide by zero

INPUT:
    {
      a: 10,
      b: 0
    }
```

### 3. Test Omes

```javascript
it('should test advanced features', () => {
    if (!process.env.ADVANCED_FEATURES_ENABLED) {
        logTestResultFlexible('advanced.test.js', 'Advanced features', 'skipped', {
            skipReason: 'Advanced features not enabled in test environment',
            description: 'Tests advanced functionality'
        })
        return
    }

    // Test logic here...
})
```

**Sortida:**
```
TEST RESULT FOR advanced.test.js: Advanced features

DESCRIPTION: Tests advanced functionality

OUTCOME:
    ⏭ SKIP
    Reason: Advanced features not enabled in test environment
```

### 4. Test de Servidor

```javascript
it('should start HTTP server', async () => {
    const config = { port: 3000, host: 'localhost' }
    const server = await startServer(config)

    logTestResultFlexible('server.test.js', 'Start HTTP server', 'ok', {
        input: config,
        output: {
            serverStarted: true,
            port: server.port,
            pid: server.pid
        },
        description: 'Tests HTTP server startup'
    })

    expect(server.isRunning).toBe(true)
})
```

**Sortida:**
```
TEST RESULT FOR server.test.js: Start HTTP server

DESCRIPTION: Tests HTTP server startup

OUTCOME:
    ✓ PASS

INPUT:
    {
      port: 3000,
      host: 'localhost'
    }

OUTPUT:
    {
      "serverStarted": true,
      "port": 3000,
      "pid": 12345
    }
```

### 5. Test MCP Tool

```javascript
it('should execute SOQL query', async () => {
    const query = 'SELECT Id FROM Account LIMIT 1'
    const result = await client.callTool('executeSoqlQuery', { query })

    logTestResultFlexible('executeSoqlQuery.test.js', 'Basic query', 'ok', {
        input: { query },
        result, // Usa 'result' per MCP tools, no 'output'
        description: 'Tests SOQL query execution'
    })

    expect(result.structuredContent.records).toBeTruthy()
})
```

**Sortida:**
```
TEST RESULT FOR executeSoqlQuery.test.js: Basic query

DESCRIPTION: Tests SOQL query execution

OUTCOME:
    ✓ PASS

INPUT:
    {
      query: 'SELECT Id FROM Account LIMIT 1'
    }

RESULT:
    content: [...]
    structuredContent: {...}
```

### 6. Test Mínim

```javascript
it('should pass basic assertion', () => {
    logTestResultFlexible('simple.test.js', 'Basic assertion', 'ok', {
        description: 'Tests that true is true'
    })

    expect(true).toBe(true)
})
```

**Sortida:**
```
TEST RESULT FOR simple.test.js: Basic assertion

DESCRIPTION: Tests that true is true

OUTCOME:
    ✓ PASS
```

## Comparació amb logTestResult

| Aspecte | `logTestResult` | `logTestResultFlexible` |
|---------|-----------------|-------------------------|
| **Ús** | Tests MCP tools | Qualsevol tipus de test |
| **Input** | Obligatori | Opcional |
| **Output** | Sempre `content` + `structuredContent` | Flexible (`output` o `result`) |
| **Descripció** | No | Sí (opcional) |
| **Flexibilitat** | Rígida | Alta |

## Recomanacions

- **Tests MCP tools**: Usa `logTestResult` (més específic)
- **Tests de unitat**: Usa `logTestResultFlexible` amb `output`
- **Tests de servidor**: Usa `logTestResultFlexible` amb `output`
- **Tests mínims**: Usa `logTestResultFlexible` només amb `description`

## Avantatges

1. **✅ Flexibilitat**: S'adapta a qualsevol tipus de test
2. **✅ Consistència**: Format estandarditzat per a tots els tests
3. **✅ Evidència**: Mostra clarament què s'ha executat
4. **✅ Debugging**: Fàcil de veure inputs i outputs
5. **✅ Opcional**: Només usa les opcions que necessitis
