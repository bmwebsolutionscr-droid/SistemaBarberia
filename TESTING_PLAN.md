# Plan de Testing - Sistema de Tipos de Servicio

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### 1. Tipos de Servicio
- **Corte** (30 minutos) - ₡5,000
- **Corte + Barba** (60 minutos) - ₡8,000

### 2. Bloqueo de Horarios Ocupados
- Corte: bloquea 2 slots de 15 minutos (30 min total)
- Corte + Barba: bloquea 4 slots de 15 minutos (60 min total)

### 3. Validación de Conflictos
- Previene citas superpuestas
- Validación en tiempo real
- Excluye citas canceladas

---

## 🧪 CASOS DE PRUEBA

### PRUEBA 1: Crear Cita de Corte (30 min)
**Pasos:**
1. Ir a Citas > Nueva Cita
2. Llenar datos del cliente
3. Seleccionar fecha futura
4. Seleccionar "Corte" como tipo de servicio
5. Seleccionar hora (ej: 10:00)
6. Guardar cita

**Resultado Esperado:**
- ✅ Cita se guarda correctamente
- ✅ Precio: ₡5,000
- ✅ Duración: 30 minutos
- ✅ Bloquea slots: 10:00 y 10:15

### PRUEBA 2: Crear Cita de Corte + Barba (60 min)
**Pasos:**
1. Ir a Citas > Nueva Cita
2. Llenar datos del cliente
3. Seleccionar fecha futura
4. Seleccionar "Corte + Barba" como tipo de servicio
5. Seleccionar hora (ej: 14:00)
6. Guardar cita

**Resultado Esperado:**
- ✅ Cita se guarda correctamente
- ✅ Precio: ₡8,000
- ✅ Duración: 60 minutos
- ✅ Bloquea slots: 14:00, 14:15, 14:30, 14:45

### PRUEBA 3: Verificar Bloqueo de Horarios - Corte
**Pasos:**
1. Con cita de corte existente a las 10:00
2. Intentar crear nueva cita el mismo día
3. Verificar horarios disponibles

**Resultado Esperado:**
- ✅ 10:00 NO disponible
- ✅ 10:15 NO disponible
- ✅ 10:30 SÍ disponible
- ✅ 09:45 SÍ disponible

### PRUEBA 4: Verificar Bloqueo de Horarios - Corte + Barba
**Pasos:**
1. Con cita de corte + barba existente a las 14:00
2. Intentar crear nueva cita el mismo día
3. Verificar horarios disponibles

**Resultado Esperado:**
- ✅ 14:00 NO disponible
- ✅ 14:15 NO disponible
- ✅ 14:30 NO disponible
- ✅ 14:45 NO disponible
- ✅ 15:00 SÍ disponible
- ✅ 13:45 SÍ disponible

### PRUEBA 5: Prevención de Conflictos
**Pasos:**
1. Crear cita corte + barba a las 10:00
2. Intentar crear cita normal a las 10:30
3. Verificar que NO se permita

**Resultado Esperado:**
- ✅ 10:30 no aparece como opción disponible
- ✅ Sistema previene el conflicto automáticamente

### PRUEBA 6: Editar Cita Existente
**Pasos:**
1. Editar una cita existente
2. Cambiar tipo de servicio
3. Verificar que precio se actualice
4. Guardar cambios

**Resultado Esperado:**
- ✅ Tipo de servicio se actualiza
- ✅ Precio se recalcula correctamente
- ✅ Duración se ajusta automáticamente

### PRUEBA 7: Visualización en Calendario
**Pasos:**
1. Ir al módulo Calendario
2. Hacer clic en día con citas
3. Verificar información mostrada

**Resultado Esperado:**
- ✅ Muestra tipo de servicio
- ✅ Muestra duración correcta
- ✅ Muestra precio correcto

### PRUEBA 8: Citas Canceladas
**Pasos:**
1. Cancelar una cita existente
2. Intentar crear nueva cita en el mismo horario
3. Verificar que horario esté disponible

**Resultado Esperado:**
- ✅ Horarios de cita cancelada vuelven a estar disponibles

---

## 🐛 CASOS EDGE

### EDGE 1: Cita al Final del Día
- Corte + barba a las 18:30 (si cierra a 19:00)
- Debe validar que no se exceda el horario

### EDGE 2: Múltiples Citas Consecutivas
- Corte 10:00-10:30
- Corte + barba 10:30-11:30
- Debe funcionar sin conflictos

### EDGE 3: Días No Laborables
- Intentar crear cita en día cerrado
- Debe mostrar error apropiado

---

## 📝 CHECKLIST DE VALIDACIÓN

### Funcionalidad Básica
- [ ] Selector de tipo de servicio aparece
- [ ] Precios se muestran correctamente
- [ ] Duración se calcula automáticamente
- [ ] Citas se guardan con tipo correcto

### Bloqueo de Horarios
- [ ] Corte bloquea 2 slots (30 min)
- [ ] Corte + barba bloquea 4 slots (60 min)
- [ ] Horarios ocupados no aparecen en selector
- [ ] Citas canceladas liberan horarios

### Validación
- [ ] No permite conflictos de horarios
- [ ] Validación funciona en tiempo real
- [ ] Edición excluye cita actual del bloqueo
- [ ] Funciona con múltiples barberos

### Interfaz de Usuario
- [ ] Dropdown de tipo de servicio funcional
- [ ] Precios se actualizan al cambiar tipo
- [ ] Calendario muestra información completa
- [ ] Reportes incluyen nuevos campos

### Rendimiento
- [ ] Carga rápida de horarios disponibles
- [ ] No hay errores en consola
- [ ] Compilación sin warnings críticos
- [ ] Base de datos responde correctamente

---

## 🚀 PRUEBAS AUTOMATIZADAS SUGERIDAS

```typescript
// Ejemplo de tests que se podrían implementar
describe('Sistema de Tipos de Servicio', () => {
  test('calcula duración correcta para corte', () => {
    expect(getServiceDuration('corte', config)).toBe(30)
  })
  
  test('calcula duración correcta para corte + barba', () => {
    expect(getServiceDuration('corte_barba', config)).toBe(60)
  })
  
  test('genera slots ocupados correctamente', () => {
    const appointment = { hora: '10:00', tipo_servicio: 'corte_barba' }
    const slots = getOccupiedSlots(appointment)
    expect(slots).toEqual(['10:00', '10:15', '10:30', '10:45'])
  })
})
```

---

## ✅ ESTADO ACTUAL
- [x] Base de datos migrada
- [x] Tipos de servicio implementados
- [x] Bloqueo de horarios funcionando
- [x] Validación de conflictos activa
- [x] Interfaz de usuario completa
- [x] Integración con calendario
- [x] Sistema de precios dinámico
