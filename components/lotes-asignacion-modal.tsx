"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Check } from "lucide-react"

interface Lote {
  id: string
  codigo: string
  producto: string
  presentacion: string
  numeroJabas: number
  pesoTotal: number
  estado: string
  fechaIngreso: string
}

interface LotesAsignacionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (lotes: Lote[]) => void
  lotesDisponibles: Lote[]
}

export function LotesAsignacionModal({ open, onOpenChange, onConfirm, lotesDisponibles }: LotesAsignacionModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLotes, setSelectedLotes] = useState<string[]>([])

  const filteredLotes = useMemo(() => {
    if (!searchTerm) return lotesDisponibles
    return lotesDisponibles.filter(
      (lote) =>
        lote.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lote.producto.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [searchTerm, lotesDisponibles])

  const handleConfirm = () => {
    const lotesSeleccionados = lotesDisponibles.filter((lote) => selectedLotes.includes(lote.id))
    onConfirm(lotesSeleccionados)
    setSelectedLotes([])
    setSearchTerm("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar Lotes al Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Búsqueda de lotes */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar lote por código o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabla de lotes disponibles */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedLotes.length === filteredLotes.length && filteredLotes.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLotes(filteredLotes.map((l) => l.id))
                        } else {
                          setSelectedLotes([])
                        }
                      }}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Presentación</TableHead>
                  <TableHead>Jabas</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLotes.map((lote) => (
                  <TableRow key={lote.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedLotes.includes(lote.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLotes([...selectedLotes, lote.id])
                          } else {
                            setSelectedLotes(selectedLotes.filter((id) => id !== lote.id))
                          }
                        }}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{lote.codigo}</TableCell>
                    <TableCell>{lote.producto}</TableCell>
                    <TableCell>{lote.presentacion}</TableCell>
                    <TableCell>{lote.numeroJabas}</TableCell>
                    <TableCell>{lote.pesoTotal} kg</TableCell>
                    <TableCell>{lote.fechaIngreso}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Resumen de selección */}
          {selectedLotes.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium">
                {selectedLotes.length} lote{selectedLotes.length !== 1 ? "s" : ""} seleccionado
                {selectedLotes.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={selectedLotes.length === 0}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar Asignación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
