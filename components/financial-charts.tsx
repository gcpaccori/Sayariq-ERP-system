"use client"

import { Card } from "@/components/ui/card"
import {
  ResponsiveContainer,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

// Datos de ingresos vs costos
const ingresosVsCostos = [
  { mes: "Ene", ingresos: 45000, costosFijos: 12000, costosVariables: 18000, utilidad: 15000 },
  { mes: "Feb", ingresos: 52000, costosFijos: 12000, costosVariables: 21000, utilidad: 19000 },
  { mes: "Mar", ingresos: 48000, costosFijos: 12000, costosVariables: 19000, utilidad: 17000 },
  { mes: "Abr", ingresos: 58000, costosFijos: 12000, costosVariables: 24000, utilidad: 22000 },
  { mes: "May", ingresos: 62000, costosFijos: 12000, costosVariables: 26000, utilidad: 24000 },
  { mes: "Jun", ingresos: 55000, costosFijos: 12000, costosVariables: 23000, utilidad: 20000 },
  { mes: "Jul", ingresos: 68000, costosFijos: 12000, costosVariables: 29000, utilidad: 27000 },
  { mes: "Ago", ingresos: 71000, costosFijos: 12000, costosVariables: 31000, utilidad: 28000 },
  { mes: "Sep", ingresos: 65000, costosFijos: 12000, costosVariables: 28000, utilidad: 25000 },
  { mes: "Oct", ingresos: 73000, costosFijos: 12000, costosVariables: 32000, utilidad: 29000 },
  { mes: "Nov", ingresos: 69000, costosFijos: 12000, costosVariables: 30000, utilidad: 27000 },
  { mes: "Dic", ingresos: 75000, costosFijos: 12000, costosVariables: 33000, utilidad: 30000 },
]

// Datos de rentabilidad por producto
const rentabilidadProductos = [
  { producto: "Kion Orgánico", ventas: 28500, costos: 18200, margen: 36.1, volumen: 1200 },
  { producto: "Cúrcuma Premium", ventas: 22800, costos: 14600, margen: 36.0, volumen: 950 },
  { producto: "Kion Deshidratado", ventas: 18900, costos: 11400, margen: 39.7, volumen: 680 },
  { producto: "Cúrcuma Molida", ventas: 15600, costos: 9800, margen: 37.2, volumen: 520 },
  { producto: "Mix Especias", ventas: 12400, costos: 8100, margen: 34.7, volumen: 380 },
]

// Datos de distribución de costos
const distribucionCostos = [
  { categoria: "Materia Prima", valor: 45, monto: 33750 },
  { categoria: "Mano de Obra", valor: 25, monto: 18750 },
  { categoria: "Procesamiento", valor: 15, monto: 11250 },
  { categoria: "Empaquetado", valor: 8, monto: 6000 },
  { categoria: "Transporte", valor: 4, monto: 3000 },
  { categoria: "Administrativos", valor: 3, monto: 2250 },
]

// Datos de flujo de caja
const flujoCaja = [
  { semana: "S1", entradas: 18500, salidas: 12300, saldo: 6200, acumulado: 6200 },
  { semana: "S2", entradas: 22100, salidas: 15800, saldo: 6300, acumulado: 12500 },
  { semana: "S3", entradas: 19800, salidas: 14200, saldo: 5600, acumulado: 18100 },
  { semana: "S4", entradas: 25600, salidas: 18900, saldo: 6700, acumulado: 24800 },
]

const COLORS = ["#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ef4444"]

export function IngresosVsCostosChart() {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Ingresos vs Costos</h3>
        <p className="text-sm text-muted-foreground">Análisis mensual de rentabilidad</p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ingresosVsCostos}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
              labelFormatter={(label) => `Mes: ${label}`}
            />
            <Legend />
            <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
            <Area type="monotone" dataKey="costosFijos" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
            <Area
              type="monotone"
              dataKey="costosVariables"
              stackId="2"
              stroke="#f97316"
              fill="#f97316"
              fillOpacity={0.6}
            />
            <Line type="monotone" dataKey="utilidad" stroke="#3b82f6" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function RentabilidadProductosChart() {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Rentabilidad por Producto</h3>
        <p className="text-sm text-muted-foreground">Margen de ganancia y volumen de ventas</p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rentabilidadProductos}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="producto" angle={-45} textAnchor="end" height={80} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "margen") return [`${value}%`, "Margen"]
                return [`$${value.toLocaleString()}`, name === "ventas" ? "Ventas" : "Costos"]
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="ventas" fill="#22c55e" name="Ventas" />
            <Bar yAxisId="left" dataKey="costos" fill="#ef4444" name="Costos" />
            <Line yAxisId="right" dataKey="margen" stroke="#3b82f6" strokeWidth={2} name="Margen %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function DistribucionCostosChart() {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Distribución de Costos</h3>
        <p className="text-sm text-muted-foreground">Desglose por categoría de gastos</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribucionCostos}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="valor"
                label={({ categoria, valor }) => `${categoria}: ${valor}%`}
              >
                {distribucionCostos.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value}%`, "Porcentaje"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {distribucionCostos.map((item, index) => (
            <div key={item.categoria} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[index] }} />
                <span className="text-sm font-medium">{item.categoria}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">${item.monto.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{item.valor}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export function FlujoCajaChart() {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Flujo de Caja Semanal</h3>
        <p className="text-sm text-muted-foreground">Entradas, salidas y saldo acumulado</p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={flujoCaja}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="semana" />
            <YAxis />
            <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, ""]} />
            <Legend />
            <Bar dataKey="entradas" fill="#22c55e" name="Entradas" />
            <Bar dataKey="salidas" fill="#ef4444" name="Salidas" />
            <Line dataKey="acumulado" stroke="#3b82f6" strokeWidth={3} name="Saldo Acumulado" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
