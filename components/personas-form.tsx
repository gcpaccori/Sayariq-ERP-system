"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, User, Building, Phone, MapPin, CreditCard, Loader2 } from "lucide-react"
import { usePersonas } from "@/lib/hooks/use-personas"
import type { Persona } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

interface PersonaFormProps {
  onClose: () => void
  persona?: Persona | null
}

interface PersonaFormData {
  nombres: string
  apellidos: string
  tipo_documento: string
  numero_documento: string
  ruc: string
  razon_social: string
  telefono: string
  email: string
  direccion: string
  distrito: string
  provincia: string
  departamento: string
  roles: string[]
  banco: string
  numero_cuenta: string
  cci: string
  observaciones: string
}

const rolesDisponibles = [
  { id: "productor", label: "Productor", color: "bg-green-500/10 text-green-500" },
  { id: "comprador", label: "Comprador", color: "bg-blue-500/10 text-blue-500" },
  { id: "jornalero", label: "Jornalero", color: "bg-orange-500/10 text-orange-500" },
  { id: "transportista", label: "Transportista", color: "bg-purple-500/10 text-purple-500" },
  { id: "supervisor", label: "Supervisor", color: "bg-red-500/10 text-red-500" },
  { id: "control_calidad", label: "Control Calidad", color: "bg-indigo-500/10 text-indigo-500" },
]

export function PersonasForm({ onClose, persona }: PersonaFormProps) {
  const { create, update } = usePersonas(false)
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<PersonaFormData>({
    nombres: "",
    apellidos: "",
    tipo_documento: "DNI",
    numero_documento: "",
    ruc: "",
    razon_social: "",
    telefono: "",
    email: "",
    direccion: "",
    distrito: "",
    provincia: "",
    departamento: "",
    roles: [],
    banco: "",
    numero_cuenta: "",
    cci: "",
    observaciones: "",
  })

  useEffect(() => {
    if (persona) {
      
      const nombres = persona.nombres || ""
const apellidos = persona.apellidos || ""


      setFormData({
        nombres: nombres,
        apellidos: apellidos,
        tipo_documento: persona.tipo_documento || "DNI",
        numero_documento: persona.numero_documento || persona.documento_identidad || "",
        ruc: persona.ruc || "",
        razon_social: persona.razon_social || "",
        telefono: persona.telefono || "",
        email: persona.email || "",
        direccion: persona.direccion || "",
        distrito: persona.distrito || "",
        provincia: persona.provincia || "",
        departamento: persona.departamento || "",
        roles: persona.roles || [],
        banco: persona.banco || "",
        numero_cuenta: persona.numero_cuenta || persona.cuenta_bancaria || "",
        cci: persona.cci || "",
        observaciones: persona.observaciones || "",
      })
    }
  }, [persona])

  const handleRoleToggle = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleId) ? prev.roles.filter((r) => r !== roleId) : [...prev.roles, roleId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombres.trim() || !formData.apellidos.trim()) {
      toast({
        title: "Error",
        description: "Los nombres y apellidos son requeridos",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (persona) {
        await update(persona.id, formData)
        toast({
          title: "Éxito",
          description: "Persona actualizada correctamente",
        })
      } else {
        await create(formData as Omit<Persona, "id" | "created_at" | "updated_at">)
        toast({
          title: "Éxito",
          description: "Persona registrada correctamente",
        })
      }
      onClose()
    } catch (error) {
      console.error("Error al guardar persona:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la persona. Intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <h2 className="text-xl font-semibold">{persona ? "Editar Persona" : "Registrar Nueva Persona"}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Información Personal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombres">Nombres *</Label>
                  <Input
                    id="nombres"
                    value={formData.nombres}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nombres: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input
                    id="apellidos"
                    value={formData.apellidos}
                    onChange={(e) => setFormData((prev) => ({ ...prev, apellidos: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="tipo_documento">Tipo de Documento</Label>
                  <select
                    id="tipo_documento"
                    className="w-full p-2 border rounded-md bg-background"
                    value={formData.tipo_documento}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tipo_documento: e.target.value }))}
                    disabled={isSubmitting}
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">Carné de Extranjería</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="numero_documento">Número de Documento *</Label>
                  <Input
                    id="numero_documento"
                    value={formData.numero_documento}
                    onChange={(e) => setFormData((prev) => ({ ...prev, numero_documento: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Información Empresarial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ruc">RUC</Label>
                  <Input
                    id="ruc"
                    value={formData.ruc}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ruc: e.target.value }))}
                    placeholder="20123456789"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="razon_social">Razón Social</Label>
                  <Input
                    id="razon_social"
                    value={formData.razon_social}
                    onChange={(e) => setFormData((prev) => ({ ...prev, razon_social: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Información de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefono">Teléfono *</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Dirección
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="direccion">Dirección Completa</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData((prev) => ({ ...prev, direccion: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="distrito">Distrito</Label>
                    <Input
                      id="distrito"
                      value={formData.distrito}
                      onChange={(e) => setFormData((prev) => ({ ...prev, distrito: e.target.value }))}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="provincia">Provincia</Label>
                    <Input
                      id="provincia"
                      value={formData.provincia}
                      onChange={(e) => setFormData((prev) => ({ ...prev, provincia: e.target.value }))}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="departamento">Departamento</Label>
                    <Input
                      id="departamento"
                      value={formData.departamento}
                      onChange={(e) => setFormData((prev) => ({ ...prev, departamento: e.target.value }))}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Roles en el Sistema</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {rolesDisponibles.map((rol) => (
                  <div key={rol.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={rol.id}
                      checked={formData.roles.includes(rol.id)}
                      onCheckedChange={() => handleRoleToggle(rol.id)}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor={rol.id} className="cursor-pointer">
                      <Badge className={rol.color}>{rol.label}</Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Información Bancaria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="banco">Banco</Label>
                  <Input
                    id="banco"
                    value={formData.banco}
                    onChange={(e) => setFormData((prev) => ({ ...prev, banco: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="numero_cuenta">Número de Cuenta</Label>
                  <Input
                    id="numero_cuenta"
                    value={formData.numero_cuenta}
                    onChange={(e) => setFormData((prev) => ({ ...prev, numero_cuenta: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="cci">CCI</Label>
                  <Input
                    id="cci"
                    value={formData.cci}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cci: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Observaciones</h3>
              <Textarea
                value={formData.observaciones}
                onChange={(e) => setFormData((prev) => ({ ...prev, observaciones: e.target.value }))}
                placeholder="Información adicional relevante..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {persona ? "Actualizar Persona" : "Registrar Persona"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
