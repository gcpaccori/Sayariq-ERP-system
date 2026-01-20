"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Search } from "lucide-react"

export function AjusteContable() {
  const [tipoAjuste, setTipoAjuste] = useState<"por-proceso" | "carga-cerrada">("por-proceso")
  const [busqueda, setBusqueda] = useState("")

  // Estado para ajuste por proceso
  const [categorias, setCategorias] = useState({
    exportable: { peso: 100.75678, precio: 2.2, monto: 220 },
    industrial: { peso: 200, precio: 1.2, monto: 240 },
    descarte: { peso: 150, precio: 0.5, monto: 75 },
  })

  // Estado para carga cerrada
  const [cargaCerrada, setCargaCerrada] = useState({
    pesoIngreso: 1800,
    precioPorKg: 2.5,
    totalCarga: 4500,
  })

  const [formData, setFormData] = useState({
    fechaPago: "",
    fechaLiquidacion: "",
    serie: "",
    numeroLC: "",
    observaciones: "",
  })

  const totalProceso = categorias.exportable.monto + categorias.industrial.monto + categorias.descarte.monto

  const handleCategoriaChange = (categoria: keyof typeof categorias, field: string, value: number) => {
    setCategorias((prev) => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [field]: value,
        monto:
          field === "peso" || field === "precio"
            ? (field === "peso" ? value : prev[categoria].peso) * (field === "precio" ? value : prev[categoria].precio)
            : prev[categoria].monto,
      },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Ajuste Pesos-precio contable</h2>
          <p className="text-muted-foreground">Registro contable y ajuste de pesos para liquidación</p>
        </div>
      </div>

      <Tabs value={tipoAjuste} onValueChange={(v) => setTipoAjuste(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="por-proceso">Por Proceso</TabsTrigger>
          <TabsTrigger value="carga-cerrada">Carga Cerrada</TabsTrigger>
        </TabsList>

        <TabsContent value="por-proceso" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Búsqueda */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Buscar Lote
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="Buscar por código de lote o productor..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Registro Contable */}
              <Card>
                <CardHeader>
                  <CardTitle>REGISTRO CONTABLE</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {Object.entries(categorias).map(([key, data]) => (
                      <div key={key} className="grid grid-cols-4 gap-4 items-center">
                        <div>
                          <Label className="capitalize">{key}</Label>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Peso Neto</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={data.peso}
                            onChange={(e) =>
                              handleCategoriaChange(key as any, "peso", Number.parseFloat(e.target.value))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Precio</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={data.precio}
                            onChange={(e) =>
                              handleCategoriaChange(key as any, "precio", Number.parseFloat(e.target.value))
                            }
                            className="font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">MONTO</Label>
                          <div className="font-bold text-lg">S/. {data.monto.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">TOTAL PROCESO:</span>
                      <span className="text-2xl font-bold text-green-600">S/. {totalProceso.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Observaciones */}
              <Card>
                <CardHeader>
                  <CardTitle>OBSERVACIONES</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Observaciones adicionales..."
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Panel derecho - Ajuste Contable */}
            <div className="space-y-6">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-yellow-800">AJUSTE CONTABLE</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <Label className="text-sm text-muted-foreground">MONTO</Label>
                    <div className="text-3xl font-bold text-yellow-700">{totalProceso.toFixed(0)}</div>
                  </div>

                  <div className="space-y-2">
                    <Label>FECHA DE PAGO</Label>
                    <Input
                      type="date"
                      value={formData.fechaPago}
                      onChange={(e) => setFormData({ ...formData, fechaPago: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>FECHA LIQUIDACIÓN</Label>
                    <Input
                      type="date"
                      value={formData.fechaLiquidacion}
                      onChange={(e) => setFormData({ ...formData, fechaLiquidacion: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>SERIE</Label>
                      <Input
                        value={formData.serie}
                        onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>N° L/C</Label>
                      <Input
                        value={formData.numeroLC}
                        onChange={(e) => setFormData({ ...formData, numeroLC: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button className="w-full" size="lg">
                    REGISTRAR
                  </Button>

                  <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
                    Los datos de ajuste contable toman en primera instancia todo lo que está en proceso, y el monto
                    final de ajuste contable es lo que se debe PAGAR al productor
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-sm">PESOS DE PROCESO</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    PARA PAGO Y REGISTRO CONTABLE PARA LOTES POR CARGA CERRADA SE CONSIDERA EL PESO INICIAL DE INGRESO
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="carga-cerrada" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Buscar Lote
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input placeholder="Buscar por código de lote o productor..." />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>REGISTRO CONTABLE - CARGA CERRADA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>PESO DE INGRESO</Label>
                      <Input
                        type="number"
                        value={cargaCerrada.pesoIngreso}
                        onChange={(e) =>
                          setCargaCerrada({
                            ...cargaCerrada,
                            pesoIngreso: Number.parseFloat(e.target.value),
                            totalCarga: Number.parseFloat(e.target.value) * cargaCerrada.precioPorKg,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>PRECIO POR KG:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cargaCerrada.precioPorKg}
                        onChange={(e) =>
                          setCargaCerrada({
                            ...cargaCerrada,
                            precioPorKg: Number.parseFloat(e.target.value),
                            totalCarga: cargaCerrada.pesoIngreso * Number.parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">TOTAL CARGA:</span>
                      <span className="text-2xl font-bold text-green-600">
                        S/. {cargaCerrada.totalCarga.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>OBSERVACIONES</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea placeholder="Observaciones adicionales..." rows={3} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-yellow-800">AJUSTE CONTABLE</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <Label className="text-sm text-muted-foreground">MONTO</Label>
                    <div className="text-3xl font-bold text-yellow-700">{cargaCerrada.totalCarga.toFixed(0)}</div>
                  </div>

                  <div className="space-y-2">
                    <Label>FECHA DE PAGO</Label>
                    <Input type="date" />
                  </div>

                  <div className="space-y-2">
                    <Label>FECHA LIQUIDACIÓN</Label>
                    <Input type="date" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>SERIE</Label>
                      <Input />
                    </div>
                    <div className="space-y-2">
                      <Label>N° L/C</Label>
                      <Input />
                    </div>
                  </div>

                  <Button className="w-full" size="lg">
                    REGISTRAR
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
