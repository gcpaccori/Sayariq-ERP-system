"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PersonasForm } from "@/components/personas-form"
import { Search, Plus, User, Edit, Trash2, Phone, MapPin, Building, AlertCircle, Loader2 } from 'lucide-react'
import { usePersonas } from "@/lib/hooks/use-personas"
import type { Persona } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

interface DisplayPersona extends Persona {
  nombre?: string
  apellidos?: string
}

const rolesConfig = {
  productor: { label: "Productor", color: "bg-green-100 text-green-800" },
  comprador: { label: "Comprador", color: "bg-blue-100 text-blue-800" },
  jornalero: { label: "Jornalero", color: "bg-orange-100 text-orange-800" },
  transportista: { label: "Transportista", color: "bg-purple-100 text-purple-800" },
  supervisor: { label: "Supervisor", color: "bg-red-100 text-red-800" },
  control_calidad: { label: "Control Calidad", color: "bg-indigo-100 text-indigo-800" },
}

export function PersonasManagement() {
  const { data: personas, loading, error, remove: removePersona, refresh } = usePersonas(true)
  const { toast } = useToast()
  const [busqueda, setBusqueda] = useState("")
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [personaEditando, setPersonaEditando] = useState<DisplayPersona | null>(null)

  const personasFiltradas = (personas as DisplayPersona[]).filter((persona) => {
    const nombreCompleto = persona.nombre_completo || `${persona.nombres || ""} ${persona.apellidos || ""}`.trim()
    const documento = persona.numero_documento || persona.documento_identidad || persona.dni || ""
    return (
      nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
      documento.includes(busqueda)
    )
  })

  const handleEliminar = async (id: number | string) => {
    try {
      await removePersona(id as number)
      toast({
        title: "Éxito",
        description: "Persona eliminada correctamente",
      })
    } catch (error) {
      console.error("Error al eliminar persona:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la persona",
        variant: "destructive",
      })
    }
  }

  const editarPersona = (persona: DisplayPersona) => {
    setPersonaEditando(persona)
    setMostrarFormulario(true)
  }

  const handleFormClose = () => {
    setMostrarFormulario(false)
    setPersonaEditando(null)
    refresh()
  }

  if (loading && personas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Cargando personas...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Error al cargar personas</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={refresh}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Personas</h1>
          <p className="text-gray-600">Administra el registro de personas del sistema</p>
        </div>
        <Button onClick={() => setMostrarFormulario(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Persona
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Personas</p>
                <p className="text-2xl font-bold">{personas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Productores</p>
                <p className="text-2xl font-bold">
                  {(personas as DisplayPersona[]).filter((p) => p.roles?.includes("productor")).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Jornaleros</p>
                <p className="text-2xl font-bold">
                  {(personas as DisplayPersona[]).filter((p) => p.roles?.includes("jornalero")).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transportistas</p>
                <p className="text-2xl font-bold">
                  {(personas as DisplayPersona[]).filter((p) => p.roles?.includes("transportista")).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, apellidos o documento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de personas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Personas ({personasFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No hay personas registradas
                  </TableCell>
                </TableRow>
              ) : (
                personasFiltradas.map((persona) => {
                  const nombreCompleto =
                    persona.nombre_completo || `${persona.nombres || ""} ${persona.apellidos || ""}`.trim()
                  const documento = persona.numero_documento || persona.documento_identidad || persona.dni || "-"
                  const tipoDocumento = persona.tipo_documento || "DNI"
                  
                  const displayRoles = persona.roles && persona.roles.length > 0 
                    ? persona.roles 
                    : persona.tipo 
                    ? [persona.tipo] 
                    : []

                  return (
                    <TableRow key={persona.id}>
                      <TableCell className="font-medium">{nombreCompleto}</TableCell>
                      <TableCell>
                        <div>
                          <span className="text-sm text-gray-500">{tipoDocumento}:</span>
                          <br />
                          <span className="font-mono">{documento}</span>
                        </div>
                      </TableCell>
                      <TableCell>{persona.telefono || "-"}</TableCell>
                      <TableCell>{persona.email || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {displayRoles.length > 0 ? (
                            displayRoles.map((rol) => (
                              <Badge key={rol} className={rolesConfig[rol as keyof typeof rolesConfig]?.color || "bg-gray-100 text-gray-800"}>
                                {rolesConfig[rol as keyof typeof rolesConfig]?.label || rol}
                              </Badge>
                            ))
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Sin rol</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{persona.estado || "activo"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editarPersona(persona)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEliminar(persona.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de formulario */}
      {mostrarFormulario && <PersonasForm persona={personaEditando} onClose={handleFormClose} />}
    </div>
  )
}
