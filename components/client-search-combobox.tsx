"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Search, X } from "lucide-react"

interface Cliente {
  id: string
  nombre: string
  tipoCliente: "nacional" | "internacional"
  ruc?: string
  direccion: string
  ciudad: string
  pais: string
  contacto: {
    nombre: string
    cargo: string
    telefono: string
    email: string
  }
}

interface ClientSearchComboboxProps {
  value: Cliente | null
  onChange: (cliente: Cliente) => void
  clientes: Cliente[]
}

export function ClientSearchCombobox({ value, onChange, clientes }: ClientSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredClientes = useMemo(() => {
    if (!searchTerm) return clientes
    return clientes.filter(
      (cliente) =>
        cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.contacto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.ciudad.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [searchTerm, clientes])

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar cliente por nombre, contacto o ciudad..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-10"
          />
        </div>
        {value && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange(null as any)
              setSearchTerm("")
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-64 overflow-y-auto">
          {filteredClientes.length > 0 ? (
            <div className="divide-y">
              {filteredClientes.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => {
                    onChange(cliente)
                    setIsOpen(false)
                    setSearchTerm("")
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{cliente.nombre}</div>
                  <div className="text-sm text-gray-600">
                    {cliente.contacto.nombre} - {cliente.ciudad}, {cliente.pais}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">No se encontraron clientes</div>
          )}
        </Card>
      )}

      {value && (
        <Card className="mt-2 p-3 bg-blue-50 border-blue-200">
          <div className="font-medium">{value.nombre}</div>
          <div className="text-sm text-gray-600">
            {value.contacto.nombre} - {value.ciudad}, {value.pais}
          </div>
        </Card>
      )}
    </div>
  )
}
