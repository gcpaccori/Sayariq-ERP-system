"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  ShoppingCart,
  Plus,
  Filter,
  Search,
  Eye,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  Calendar,
  User,
  DollarSign,
  X,
  Edit,
  Globe,
  MapPin,
  FileText,
  Settings,
  Download,
} from "lucide-react"
import { ClientSearchCombobox } from "@/components/client-search-combobox"
import { LotesAsignacionModal } from "@/components/lotes-asignacion-modal"

// ... existing interfaces ...
interface ProductoPedido {
  id: string
  nombre: string
  tipoProducto: "jengibre" | "curcuma"
  categoria: "exportable" | "industrial" | "nacional" | "organico"
  cantidad: number
  unidad: "kg" | "toneladas" | "jabas"
  precioUnitario: number
  subtotal: number
  especificaciones: {
    presentacion?: "cajas" | "mallas" | "lermas" | "jabas"
    cantidad?: number
    pesoBruto?: number
    pesoNeto?: number
    humedad?: number
    totalKilogramos?: number
    calibre?: string
    empaque?: string
    etiquetado?: string
    certificaciones?: string[]
  }
}

interface Pedido {
  id: string
  numero: string
  fechaCreacion: string
  fechaPedido: string
  fechaEntregaRequerida: string
  cliente: {
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
  tipoMercado: "exportacion" | "nacional"
  incoterm?: "FOB" | "CIF" | "EXW" | "FCA" | "CPT" | "CIP"
  puertoDestino?: string
  moneda: "USD" | "PEN" | "EUR"
  productos: ProductoPedido[]
  subtotal: number
  igv: number
  total: number
  estado: "borrador" | "enviado" | "confirmado" | "en-preparacion" | "listo" | "enviado" | "entregado" | "cancelado"
  prioridad: "baja" | "media" | "alta" | "urgente"
  condicionesPago: string
  observaciones?: string
  especificacionesGenerales?: string
  documentosRequeridos?: string[]
  loteAsignado?: string
  lotesAsignados?: Array<{ codigo: string; numeroJabas: number; fechaAsignacion: string }>
  fechaAsignacion?: string
  responsableComercial: string
}

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

// ... existing estadoColors and estadoIcons ...
const estadoColors = {
  borrador: "bg-gray-100 text-gray-800 border-gray-300",
  enviado: "bg-blue-100 text-blue-800 border-blue-300",
  confirmado: "bg-green-100 text-green-800 border-green-300",
  "en-preparacion": "bg-purple-100 text-purple-800 border-purple-300",
  listo: "bg-emerald-100 text-emerald-800 border-emerald-300",
  entregado: "bg-teal-100 text-teal-800 border-teal-300",
  cancelado: "bg-red-100 text-red-800 border-red-300",
}

const estadoIcons = {
  borrador: FileText,
  enviado: Clock,
  confirmado: CheckCircle,
  "en-preparacion": Package,
  listo: CheckCircle,
  entregado: Truck,
  cancelado: AlertCircle,
}

const clientesRegistrados = [
  {
    id: "1",
    nombre: "Exportadora Lima SAC",
    tipoCliente: "nacional" as const,
    ruc: "20123456789",
    direccion: "Av. Argentina 1234",
    ciudad: "Callao",
    pais: "Perú",
    contacto: {
      nombre: "Carlos Mendoza",
      cargo: "Gerente de Compras",
      telefono: "987654321",
      email: "carlos@exportadoralima.com",
    },
  },
  {
    id: "2",
    nombre: "Distribuidora Norte EIRL",
    tipoCliente: "nacional" as const,
    ruc: "10987654321",
    direccion: "Jr. Huancayo 567",
    ciudad: "Trujillo",
    pais: "Perú",
    contacto: {
      nombre: "Ana García",
      cargo: "Jefe de Compras",
      telefono: "912345678",
      email: "ana@distribuidoranorte.com",
    },
  },
]

const lotesDisponibles: Lote[] = [
  {
    id: "1",
    codigo: "LOT-2024-018",
    producto: "Jengibre",
    presentacion: "Fresco",
    numeroJabas: 45,
    pesoTotal: 1125,
    estado: "disponible",
    fechaIngreso: "2024-12-10",
  },
  {
    id: "2",
    codigo: "LOT-2024-019",
    producto: "Cúrcuma",
    presentacion: "Fresco",
    numeroJabas: 30,
    pesoTotal: 750,
    estado: "disponible",
    fechaIngreso: "2024-12-15",
  },
]

export default function PedidosPage() {
  const { toast } = useToast()
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroCliente, setFiltroCliente] = useState("todos")
  const [filtroTipoMercado, setFiltroTipoMercado] = useState("todos")
  const [busqueda, setBusqueda] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoPedido, setEditandoPedido] = useState<Pedido | null>(null)
  const [mostrarAsignacionLotes, setMostrarAsignacionLotes] = useState(false)
  const [pedidoParaAsignar, setPedidoParaAsignar] = useState<Pedido | null>(null)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null)

  const [formularioPedido, setFormularioPedido] = useState<Partial<Pedido>>({
    cliente: {
      nombre: "",
      tipoCliente: "nacional",
      direccion: "",
      ciudad: "",
      pais: "Perú",
      contacto: {
        nombre: "",
        cargo: "",
        telefono: "",
        email: "",
      },
    },
    tipoMercado: "nacional",
    moneda: "PEN",
    productos: [],
    condicionesPago: "",
    responsableComercial: "",
    prioridad: "media",
    estado: "borrador",
    lotesAsignados: [],
  })

  const [productoTemporal, setProductoTemporal] = useState<Partial<ProductoPedido>>({
    nombre: "",
    tipoProducto: "jengibre",
    categoria: "exportable",
    cantidad: 0,
    unidad: "kg",
    precioUnitario: 0,
    especificaciones: {
      presentacion: "cajas",
      cantidad: 0,
      pesoBruto: 0,
      pesoNeto: 0,
      humedad: 0,
      totalKilogramos: 0,
    },
  })

  const [pedidos] = useState<Pedido[]>([
    {
      id: "1",
      numero: "PED-2024-001",
      fechaCreacion: "2024-12-20T08:00:00",
      fechaPedido: "2024-12-20T08:30:00",
      fechaEntregaRequerida: "2024-12-25T14:00:00",
      cliente: {
        nombre: "Exportadora Lima SAC",
        tipoCliente: "nacional",
        ruc: "20123456789",
        direccion: "Av. Argentina 1234",
        ciudad: "Callao",
        pais: "Perú",
        contacto: {
          nombre: "Carlos Mendoza",
          cargo: "Gerente de Compras",
          telefono: "987654321",
          email: "carlos@exportadoralima.com",
        },
      },
      tipoMercado: "exportacion",
      incoterm: "FOB",
      puertoDestino: "Puerto del Callao",
      moneda: "USD",
      productos: [
        {
          id: "p1",
          nombre: "Jengibre Fresco Premium",
          tipoProducto: "jengibre",
          categoria: "exportable",
          cantidad: 500,
          unidad: "kg",
          precioUnitario: 2.5,
          subtotal: 1250,
          especificaciones: {
            presentacion: "cajas",
            cantidad: 50,
            pesoBruto: 550,
            pesoNeto: 500,
            humedad: 85,
            totalKilogramos: 500,
            calibre: "80-150g",
            empaque: "Cajas de cartón 10kg",
            etiquetado: "Etiqueta exportación",
            certificaciones: ["Orgánico", "Global GAP"],
          },
        },
      ],
      subtotal: 1250,
      igv: 0,
      total: 1250,
      estado: "confirmado",
      prioridad: "alta",
      condicionesPago: "Carta de crédito 30 días",
      observaciones: "Entrega en horario de oficina. Coordinar con almacén.",
      especificacionesGenerales: "Producto para mercado europeo, cumplir estándares EU",
      documentosRequeridos: ["Certificado fitosanitario", "Certificado de origen", "Factura comercial"],
      lotesAsignados: [{ codigo: "LOT-2024-018", numeroJabas: 45, fechaAsignacion: "2024-12-20" }],
      responsableComercial: "Ana García",
    },
    {
      id: "2",
      numero: "PED-2024-002",
      fechaCreacion: "2024-12-21T09:00:00",
      fechaPedido: "2024-12-21T10:15:00",
      fechaEntregaRequerida: "2024-12-28T09:00:00",
      cliente: {
        nombre: "Distribuidora Norte EIRL",
        tipoCliente: "nacional",
        ruc: "10987654321",
        direccion: "Jr. Huancayo 567",
        ciudad: "Trujillo",
        pais: "Perú",
        contacto: {
          nombre: "Ana García",
          cargo: "Jefe de Compras",
          telefono: "912345678",
          email: "ana@distribuidoranorte.com",
        },
      },
      tipoMercado: "nacional",
      moneda: "PEN",
      productos: [
        {
          id: "p2",
          nombre: "Jengibre Nacional Seleccionado",
          tipoProducto: "jengibre",
          categoria: "nacional",
          cantidad: 100,
          unidad: "kg",
          precioUnitario: 8.0,
          subtotal: 800,
          especificaciones: {
            presentacion: "jabas",
            cantidad: 10,
            pesoBruto: 110,
            pesoNeto: 100,
            humedad: 88,
            totalKilogramos: 100,
            empaque: "Sacos de 25kg",
            etiquetado: "Etiqueta nacional",
          },
        },
      ],
      subtotal: 800,
      igv: 144,
      total: 944,
      estado: "en-preparacion",
      prioridad: "media",
      condicionesPago: "30 días",
      lotesAsignados: [],
      responsableComercial: "Luis Torres",
    },
  ])

  const clientesUnicos = [...new Set(pedidos.map((pedido) => pedido.cliente.nombre))].sort()

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const matchEstado = filtroEstado === "todos" || pedido.estado === filtroEstado
    const matchCliente = filtroCliente === "todos" || pedido.cliente.nombre === filtroCliente
    const matchTipoMercado = filtroTipoMercado === "todos" || pedido.tipoMercado === filtroTipoMercado
    const matchBusqueda =
      pedido.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.cliente.contacto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.productos.some((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))

    let matchesFecha = true
    if (fechaDesde || fechaHasta) {
      const fechaPedido = new Date(pedido.fechaPedido)
      if (fechaDesde) {
        const desde = new Date(fechaDesde)
        matchesFecha = matchesFecha && fechaPedido >= desde
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta)
        matchesFecha = matchesFecha && fechaPedido <= hasta
      }
    }

    return matchEstado && matchCliente && matchTipoMercado && matchBusqueda && matchesFecha
  })

  const estadisticas = {
    total: pedidos.length,
    borradores: pedidos.filter((p) => p.estado === "borrador").length,
    confirmados: pedidos.filter((p) => p.estado === "confirmado").length,
    enPreparacion: pedidos.filter((p) => p.estado === "en-preparacion").length,
    exportacion: pedidos.filter((p) => p.tipoMercado === "exportacion").length,
    valorTotal: pedidos.reduce((sum, p) => sum + p.total, 0),
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const handleEstadoChange = (pedidoId: string, nuevoEstado: string) => {
    toast({
      title: "Estado actualizado",
      description: `El pedido ha sido marcado como ${nuevoEstado}`,
    })
  }

  const handleVerDetalle = (pedido: Pedido) => {
    setPedidoSeleccionado(pedido)
  }

  const handleEditarPedido = (pedido: Pedido) => {
    setEditandoPedido(pedido)
    setFormularioPedido(pedido)
    setMostrarFormulario(true)
  }

  const handleNuevoPedido = () => {
    setEditandoPedido(null)
    setClienteSeleccionado(null)
    setFormularioPedido({
      cliente: {
        nombre: "",
        tipoCliente: "nacional",
        direccion: "",
        ciudad: "",
        pais: "Perú",
        contacto: {
          nombre: "",
          cargo: "",
          telefono: "",
          email: "",
        },
      },
      tipoMercado: "nacional",
      moneda: "PEN",
      productos: [],
      condicionesPago: "",
      responsableComercial: "",
      prioridad: "media",
      estado: "borrador",
      lotesAsignados: [],
    })
    setMostrarFormulario(true)
  }

  const agregarProducto = () => {
    if (!productoTemporal.nombre || !productoTemporal.cantidad || !productoTemporal.precioUnitario) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos del producto",
        variant: "destructive",
      })
      return
    }

    const nuevoProducto: ProductoPedido = {
      id: `p${Date.now()}`,
      nombre: productoTemporal.nombre!,
      tipoProducto: productoTemporal.tipoProducto!,
      categoria: productoTemporal.categoria!,
      cantidad: productoTemporal.cantidad!,
      unidad: productoTemporal.unidad!,
      precioUnitario: productoTemporal.precioUnitario!,
      subtotal: productoTemporal.cantidad! * productoTemporal.precioUnitario!,
      especificaciones: productoTemporal.especificaciones!,
    }

    setFormularioPedido((prev) => ({
      ...prev,
      productos: [...(prev.productos || []), nuevoProducto],
    }))

    setProductoTemporal({
      nombre: "",
      tipoProducto: "jengibre",
      categoria: "exportable",
      cantidad: 0,
      unidad: "kg",
      precioUnitario: 0,
      especificaciones: {
        presentacion: "cajas",
        cantidad: 0,
        pesoBruto: 0,
        pesoNeto: 0,
        humedad: 0,
        totalKilogramos: 0,
      },
    })
  }

  const eliminarProducto = (productoId: string) => {
    setFormularioPedido((prev) => ({
      ...prev,
      productos: prev.productos?.filter((p) => p.id !== productoId) || [],
    }))
  }

  const calcularTotales = () => {
    const subtotal = formularioPedido.productos?.reduce((sum, p) => sum + p.subtotal, 0) || 0
    const igv = formularioPedido.tipoMercado === "nacional" ? subtotal * 0.18 : 0
    const total = subtotal + igv

    return { subtotal, igv, total }
  }

  const guardarPedido = () => {
    const { subtotal, igv, total } = calcularTotales()

    const pedidoCompleto: Pedido = {
      ...(formularioPedido as Pedido),
      id: editandoPedido?.id || `${Date.now()}`,
      numero:
        editandoPedido?.numero || `PED-${new Date().getFullYear()}-${String(pedidos.length + 1).padStart(3, "0")}`,
      fechaCreacion: editandoPedido?.fechaCreacion || new Date().toISOString(),
      fechaPedido: new Date().toISOString(),
      subtotal,
      igv,
      total,
    }

    toast({
      title: editandoPedido ? "Pedido actualizado" : "Pedido creado",
      description: `El pedido ${pedidoCompleto.numero} ha sido ${editandoPedido ? "actualizado" : "creado"} exitosamente`,
    })

    setMostrarFormulario(false)
    setEditandoPedido(null)
  }

  const limpiarFiltros = () => {
    setBusqueda("")
    setFiltroEstado("todos")
    setFiltroCliente("todos")
    setFiltroTipoMercado("todos")
    setFechaDesde("")
    setFechaHasta("")
  }

  const handleAsignarLotes = (pedido: Pedido) => {
    setPedidoParaAsignar(pedido)
    setMostrarAsignacionLotes(true)
  }

  const handleConfirmarAsignacion = (lotesSeleccionados: Lote[]) => {
    if (pedidoParaAsignar) {
      const lotesAsignados = lotesSeleccionados.map((lote) => ({
        codigo: lote.codigo,
        numeroJabas: lote.numeroJabas,
        fechaAsignacion: new Date().toISOString().split("T")[0],
      }))

      toast({
        title: "Lotes asignados",
        description: `Se asignaron ${lotesSeleccionados.length} lote(s) al pedido ${pedidoParaAsignar.numero}`,
      })

      setMostrarAsignacionLotes(false)
      setPedidoParaAsignar(null)
    }
  }

  return (
    <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
      {/* ... existing header and stats ... */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Gestión de Pedidos</h1>
          <p className="text-sm text-muted-foreground">Control de órdenes comerciales y seguimiento de entregas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 text-sm bg-transparent">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          <Button onClick={handleNuevoPedido} className="gap-2 text-sm">
            <Plus className="h-4 w-4" />
            Nuevo Pedido
          </Button>
        </div>
      </div>

      {/* ... existing stats cards ... */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{estadisticas.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm text-muted-foreground">Borradores</p>
              <p className="text-2xl font-bold">{estadisticas.borradores}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Confirmados</p>
              <p className="text-2xl font-bold">{estadisticas.confirmados}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">En Preparación</p>
              <p className="text-2xl font-bold">{estadisticas.enPreparacion}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-500" />
            <div>
              <p className="text-sm text-muted-foreground">Exportación</p>
              <p className="text-2xl font-bold">{estadisticas.exportacion}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-lg font-bold">S/ {estadisticas.valorTotal.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ... existing filters ... */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedidos..."
                className="pl-10 text-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMostrarFiltros(!mostrarFiltros)} className="text-sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros Avanzados
              </Button>
              {(filtroEstado !== "todos" ||
                filtroCliente !== "todos" ||
                filtroTipoMercado !== "todos" ||
                fechaDesde ||
                fechaHasta) && (
                <Button variant="outline" onClick={limpiarFiltros} className="text-sm bg-transparent">
                  <X className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* ... existing quick filters ... */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={filtroEstado === "todos" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFiltroEstado("todos")}
            >
              Todos
            </Badge>
            <Badge
              variant={filtroEstado === "borrador" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFiltroEstado("borrador")}
            >
              Borradores
            </Badge>
            <Badge
              variant={filtroEstado === "confirmado" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFiltroEstado("confirmado")}
            >
              Confirmados
            </Badge>
            <Badge
              variant={filtroEstado === "en-preparacion" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFiltroEstado("en-preparacion")}
            >
              En Preparación
            </Badge>
            <Badge
              variant={filtroTipoMercado === "exportacion" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFiltroTipoMercado(filtroTipoMercado === "exportacion" ? "todos" : "exportacion")}
            >
              <Globe className="h-3 w-3 mr-1" />
              Exportación
            </Badge>
          </div>

          {/* ... existing advanced filters ... */}
          {mostrarFiltros && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Estado</Label>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="en-preparacion">En Preparación</SelectItem>
                    <SelectItem value="listo">Listo</SelectItem>
                    <SelectItem value="entregado">Entregado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Cliente</Label>
                <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {clientesUnicos.map((cliente) => (
                      <SelectItem key={cliente} value={cliente}>
                        {cliente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de Mercado</Label>
                <Select value={filtroTipoMercado} onValueChange={setFiltroTipoMercado}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="exportacion">Exportación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Fecha Desde</Label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Fecha Hasta</Label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4 lg:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Listado de Pedidos</h3>
          <p className="text-sm text-muted-foreground">
            {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? "pedido encontrado" : "pedidos encontrados"}
            {pedidos.length !== pedidosFiltrados.length && ` de ${pedidos.length} total`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha Pedido</TableHead>
                <TableHead>Entrega Requerida</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Lotes Asignados</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosFiltrados.map((pedido) => {
                const EstadoIcon = estadoIcons[pedido.estado]
                return (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{pedido.numero}</p>
                        <p className="text-xs text-muted-foreground">
                          {pedido.productos.length} producto{pedido.productos.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{pedido.cliente.nombre}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {pedido.cliente.tipoCliente === "internacional" ? (
                            <Globe className="h-3 w-3" />
                          ) : (
                            <MapPin className="h-3 w-3" />
                          )}
                          {pedido.cliente.ciudad}, {pedido.cliente.pais}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={pedido.tipoMercado === "exportacion" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {pedido.tipoMercado === "exportacion" ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Exportación
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3 mr-1" />
                            Nacional
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(pedido.fechaPedido)}</TableCell>
                    <TableCell>{formatDate(pedido.fechaEntregaRequerida)}</TableCell>
                    <TableCell>
                      <Badge className={`${estadoColors[pedido.estado]} gap-1`}>
                        <EstadoIcon className="h-3 w-3" />
                        {pedido.estado.replace("-", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {pedido.moneda} {pedido.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleAsignarLotes(pedido)} className="gap-1">
                        <Download className="h-4 w-4" />
                        {pedido.lotesAsignados?.length || 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleVerDetalle(pedido)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditarPedido(pedido)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Select onValueChange={(value) => handleEstadoChange(pedido.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="borrador">Borrador</SelectItem>
                            <SelectItem value="enviado">Enviado</SelectItem>
                            <SelectItem value="confirmado">Confirmado</SelectItem>
                            <SelectItem value="en-preparacion">En Preparación</SelectItem>
                            <SelectItem value="listo">Listo</SelectItem>
                            <SelectItem value="entregado">Entregado</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {pedidosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron pedidos</h3>
            <p className="text-muted-foreground mb-4">
              {busqueda ||
              filtroEstado !== "todos" ||
              filtroCliente !== "todos" ||
              filtroTipoMercado !== "todos" ||
              fechaDesde ||
              fechaHasta
                ? "Intenta ajustar los filtros de búsqueda"
                : "Comienza creando tu primer pedido comercial"}
            </p>
            <Button onClick={handleNuevoPedido} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Primer Pedido
            </Button>
          </div>
        )}
      </Card>

      {mostrarFormulario && (
        <Dialog open={mostrarFormulario} onOpenChange={setMostrarFormulario}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editandoPedido ? `Editar Pedido ${editandoPedido.numero}` : "Nuevo Pedido Comercial"}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="cliente" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="cliente">Cliente</TabsTrigger>
                <TabsTrigger value="productos">Productos</TabsTrigger>
                <TabsTrigger value="comercial">Comercial</TabsTrigger>
                <TabsTrigger value="resumen">Resumen</TabsTrigger>
              </TabsList>

              {/* Tab Cliente */}
              <TabsContent value="cliente" className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Búsqueda de Cliente Registrado</h3>
                  <ClientSearchCombobox
                    value={clienteSeleccionado}
                    onChange={(cliente) => {
                      setClienteSeleccionado(cliente)
                      setFormularioPedido((prev) => ({
                        ...prev,
                        cliente: cliente,
                      }))
                    }}
                    clientes={clientesRegistrados}
                  />
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Información del Cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre del Cliente *</Label>
                      <Input
                        value={formularioPedido.cliente?.nombre || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({
                            ...prev,
                            cliente: { ...prev.cliente!, nombre: e.target.value },
                          }))
                        }
                        placeholder="Nombre de la empresa o cliente"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Cliente</Label>
                      <Select
                        value={formularioPedido.cliente?.tipoCliente}
                        onValueChange={(value: "nacional" | "internacional") =>
                          setFormularioPedido((prev) => ({
                            ...prev,
                            cliente: { ...prev.cliente!, tipoCliente: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nacional">Nacional</SelectItem>
                          <SelectItem value="internacional">Internacional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>RUC / Tax ID</Label>
                      <Input
                        value={formularioPedido.cliente?.ruc || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({
                            ...prev,
                            cliente: { ...prev.cliente!, ruc: e.target.value },
                          }))
                        }
                        placeholder="20123456789"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>País *</Label>
                      <Input
                        value={formularioPedido.cliente?.pais || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({
                            ...prev,
                            cliente: { ...prev.cliente!, pais: e.target.value },
                          }))
                        }
                        placeholder="Perú"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Dirección *</Label>
                      <Input
                        value={formularioPedido.cliente?.direccion || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({
                            ...prev,
                            cliente: { ...prev.cliente!, direccion: e.target.value },
                          }))
                        }
                        placeholder="Dirección completa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ciudad *</Label>
                      <Input
                        value={formularioPedido.cliente?.ciudad || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({
                            ...prev,
                            cliente: { ...prev.cliente!, ciudad: e.target.value },
                          }))
                        }
                        placeholder="Lima"
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Contacto Principal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre del Contacto *</Label>
                      <Input
                        value={formularioPedido.cliente?.contacto?.nombre || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({
                            ...prev,
                            cliente: {
                              ...prev.cliente!,
                              contacto: { ...prev.cliente!.contacto, nombre: e.target.value },
                            },
                          }))
                        }
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cargo</Label>
                      <Input
                        value={formularioPedido.cliente?.contacto?.cargo || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({
                            ...prev,
                            cliente: {
                              ...prev.cliente!,
                              contacto: { ...prev.cliente!.contacto, cargo: e.target.value },
                            },
                          }))
                        }
                        placeholder="Gerente de Compras"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono *</Label>
                      <Input
                        value={formularioPedido.cliente?.contacto?.telefono || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({
                            ...prev,
                            cliente: {
                              ...prev.cliente!,
                              contacto: { ...prev.cliente!.contacto, telefono: e.target.value },
                            },
                          }))
                        }
                        placeholder="+51 987654321"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formularioPedido.cliente?.contacto?.email || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({
                            ...prev,
                            cliente: {
                              ...prev.cliente!,
                              contacto: { ...prev.cliente!.contacto, email: e.target.value },
                            },
                          }))
                        }
                        placeholder="contacto@empresa.com"
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Tab Productos */}
              <TabsContent value="productos" className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Agregar Producto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre del Producto *</Label>
                      <Input
                        value={productoTemporal.nombre || ""}
                        onChange={(e) => setProductoTemporal((prev) => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Jengibre Fresco Premium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Producto</Label>
                      <Select
                        value={productoTemporal.tipoProducto}
                        onValueChange={(value: "jengibre" | "curcuma") =>
                          setProductoTemporal((prev) => ({ ...prev, tipoProducto: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jengibre">Jengibre</SelectItem>
                          <SelectItem value="curcuma">Cúrcuma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select
                        value={productoTemporal.categoria}
                        onValueChange={(value: "exportable" | "industrial" | "nacional" | "organico") =>
                          setProductoTemporal((prev) => ({ ...prev, categoria: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exportable">Exportable</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                          <SelectItem value="nacional">Nacional</SelectItem>
                          <SelectItem value="organico">Orgánico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cantidad *</Label>
                      <Input
                        type="number"
                        value={productoTemporal.cantidad || ""}
                        onChange={(e) => setProductoTemporal((prev) => ({ ...prev, cantidad: Number(e.target.value) }))}
                        placeholder="500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unidad</Label>
                      <Select
                        value={productoTemporal.unidad}
                        onValueChange={(value: "kg" | "toneladas" | "jabas") =>
                          setProductoTemporal((prev) => ({ ...prev, unidad: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilogramos</SelectItem>
                          <SelectItem value="toneladas">Toneladas</SelectItem>
                          <SelectItem value="jabas">Jabas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Precio Unitario *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productoTemporal.precioUnitario || ""}
                        onChange={(e) =>
                          setProductoTemporal((prev) => ({ ...prev, precioUnitario: Number(e.target.value) }))
                        }
                        placeholder="2.50"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <h4 className="font-medium">Especificaciones del Producto</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Presentación</Label>
                        <Select
                          value={productoTemporal.especificaciones?.presentacion}
                          onValueChange={(value: "cajas" | "mallas" | "lermas" | "jabas") =>
                            setProductoTemporal((prev) => ({
                              ...prev,
                              especificaciones: { ...prev.especificaciones!, presentacion: value },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cajas">Cajas</SelectItem>
                            <SelectItem value="mallas">Mallas</SelectItem>
                            <SelectItem value="lermas">Lermas</SelectItem>
                            <SelectItem value="jabas">Jabas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          value={productoTemporal.especificaciones?.cantidad || ""}
                          onChange={(e) =>
                            setProductoTemporal((prev) => ({
                              ...prev,
                              especificaciones: { ...prev.especificaciones!, cantidad: Number(e.target.value) },
                            }))
                          }
                          placeholder="50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Peso Bruto (kg)</Label>
                        <Input
                          type="number"
                          value={productoTemporal.especificaciones?.pesoBruto || ""}
                          onChange={(e) =>
                            setProductoTemporal((prev) => ({
                              ...prev,
                              especificaciones: { ...prev.especificaciones!, pesoBruto: Number(e.target.value) },
                            }))
                          }
                          placeholder="550"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Peso Neto (kg)</Label>
                        <Input
                          type="number"
                          value={productoTemporal.especificaciones?.pesoNeto || ""}
                          onChange={(e) =>
                            setProductoTemporal((prev) => ({
                              ...prev,
                              especificaciones: { ...prev.especificaciones!, pesoNeto: Number(e.target.value) },
                            }))
                          }
                          placeholder="500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Humedad (%)</Label>
                        <Input
                          type="number"
                          value={productoTemporal.especificaciones?.humedad || ""}
                          onChange={(e) =>
                            setProductoTemporal((prev) => ({
                              ...prev,
                              especificaciones: { ...prev.especificaciones!, humedad: Number(e.target.value) },
                            }))
                          }
                          placeholder="85"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Kilogramos</Label>
                        <Input
                          type="number"
                          value={productoTemporal.especificaciones?.totalKilogramos || ""}
                          onChange={(e) =>
                            setProductoTemporal((prev) => ({
                              ...prev,
                              especificaciones: { ...prev.especificaciones!, totalKilogramos: Number(e.target.value) },
                            }))
                          }
                          placeholder="500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={agregarProducto} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Agregar Producto
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* ... existing product list ... */}
                {formularioPedido.productos && formularioPedido.productos.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Productos en el Pedido</h3>
                    <div className="space-y-3">
                      {formularioPedido.productos.map((producto) => (
                        <div key={producto.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{producto.nombre}</h4>
                              <Badge variant="outline" className="text-xs">
                                {producto.tipoProducto} - {producto.categoria}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span>
                                {producto.cantidad} {producto.unidad}
                              </span>
                              <span className="mx-2">•</span>
                              <span>
                                {formularioPedido.moneda} {producto.precioUnitario}
                              </span>
                              <span className="mx-2">•</span>
                              <span className="font-medium">
                                {formularioPedido.moneda} {producto.subtotal.toFixed(2)}
                              </span>
                            </div>
                            {producto.especificaciones.presentacion && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {producto.especificaciones.presentacion}
                                {producto.especificaciones.humedad &&
                                  ` • ${producto.especificaciones.humedad}% humedad`}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => eliminarProducto(producto.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>

              {/* ... existing comercial and resumen tabs ... */}
              <TabsContent value="comercial" className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Información Comercial</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Mercado *</Label>
                      <Select
                        value={formularioPedido.tipoMercado}
                        onValueChange={(value: "nacional" | "exportacion") =>
                          setFormularioPedido((prev) => ({ ...prev, tipoMercado: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nacional">Nacional</SelectItem>
                          <SelectItem value="exportacion">Exportación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Moneda *</Label>
                      <Select
                        value={formularioPedido.moneda}
                        onValueChange={(value: "USD" | "PEN" | "EUR") =>
                          setFormularioPedido((prev) => ({ ...prev, moneda: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PEN">Soles (PEN)</SelectItem>
                          <SelectItem value="USD">Dólares (USD)</SelectItem>
                          <SelectItem value="EUR">Euros (EUR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formularioPedido.tipoMercado === "exportacion" && (
                      <>
                        <div className="space-y-2">
                          <Label>Incoterm</Label>
                          <Select
                            value={formularioPedido.incoterm}
                            onValueChange={(value: "FOB" | "CIF" | "EXW" | "FCA" | "CPT" | "CIP") =>
                              setFormularioPedido((prev) => ({ ...prev, incoterm: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FOB">FOB - Free On Board</SelectItem>
                              <SelectItem value="CIF">CIF - Cost, Insurance & Freight</SelectItem>
                              <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                              <SelectItem value="FCA">FCA - Free Carrier</SelectItem>
                              <SelectItem value="CPT">CPT - Carriage Paid To</SelectItem>
                              <SelectItem value="CIP">CIP - Carriage & Insurance Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Puerto de Destino</Label>
                          <Input
                            value={formularioPedido.puertoDestino || ""}
                            onChange={(e) =>
                              setFormularioPedido((prev) => ({ ...prev, puertoDestino: e.target.value }))
                            }
                            placeholder="Puerto del Callao"
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label>Prioridad</Label>
                      <Select
                        value={formularioPedido.prioridad}
                        onValueChange={(value: "baja" | "media" | "alta" | "urgente") =>
                          setFormularioPedido((prev) => ({ ...prev, prioridad: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baja">Baja</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Responsable Comercial *</Label>
                      <Input
                        value={formularioPedido.responsableComercial || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({ ...prev, responsableComercial: e.target.value }))
                        }
                        placeholder="Ana García"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de Entrega Requerida *</Label>
                      <Input
                        type="date"
                        value={formularioPedido.fechaEntregaRequerida || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({ ...prev, fechaEntregaRequerida: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Condiciones y Especificaciones</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Condiciones de Pago *</Label>
                      <Textarea
                        value={formularioPedido.condicionesPago || ""}
                        onChange={(e) => setFormularioPedido((prev) => ({ ...prev, condicionesPago: e.target.value }))}
                        placeholder="Carta de crédito 30 días / Pago contra entrega / etc."
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Especificaciones Generales</Label>
                      <Textarea
                        value={formularioPedido.especificacionesGenerales || ""}
                        onChange={(e) =>
                          setFormularioPedido((prev) => ({ ...prev, especificacionesGenerales: e.target.value }))
                        }
                        placeholder="Requisitos especiales, estándares de calidad, certificaciones requeridas..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Observaciones</Label>
                      <Textarea
                        value={formularioPedido.observaciones || ""}
                        onChange={(e) => setFormularioPedido((prev) => ({ ...prev, observaciones: e.target.value }))}
                        placeholder="Información adicional, instrucciones especiales..."
                        rows={2}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="resumen" className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Resumen del Pedido</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <h4 className="font-medium mb-2">Cliente</h4>
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{formularioPedido.cliente?.nombre}</p>
                        <p>
                          {formularioPedido.cliente?.contacto?.nombre} - {formularioPedido.cliente?.contacto?.cargo}
                        </p>
                        <p>{formularioPedido.cliente?.direccion}</p>
                        <p>
                          {formularioPedido.cliente?.ciudad}, {formularioPedido.cliente?.pais}
                        </p>
                        <p>
                          {formularioPedido.cliente?.contacto?.telefono} | {formularioPedido.cliente?.contacto?.email}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Información Comercial</h4>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-medium">Tipo:</span> {formularioPedido.tipoMercado}
                        </p>
                        <p>
                          <span className="font-medium">Moneda:</span> {formularioPedido.moneda}
                        </p>
                        {formularioPedido.incoterm && (
                          <p>
                            <span className="font-medium">Incoterm:</span> {formularioPedido.incoterm}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Prioridad:</span> {formularioPedido.prioridad}
                        </p>
                        <p>
                          <span className="font-medium">Responsable:</span> {formularioPedido.responsableComercial}
                        </p>
                        <p>
                          <span className="font-medium">Entrega:</span> {formularioPedido.fechaEntregaRequerida}
                        </p>
                      </div>
                    </div>
                  </div>

                  {formularioPedido.productos && formularioPedido.productos.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3">Productos</h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Cantidad</TableHead>
                              <TableHead>Precio Unit.</TableHead>
                              <TableHead>Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {formularioPedido.productos.map((producto) => (
                              <TableRow key={producto.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{producto.nombre}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {producto.tipoProducto} - {producto.categoria}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {producto.cantidad} {producto.unidad}
                                </TableCell>
                                <TableCell>
                                  {formularioPedido.moneda} {producto.precioUnitario.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  {formularioPedido.moneda} {producto.subtotal.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>
                            {formularioPedido.moneda} {calcularTotales().subtotal.toFixed(2)}
                          </span>
                        </div>
                        {formularioPedido.tipoMercado === "nacional" && (
                          <div className="flex justify-between">
                            <span>IGV (18%):</span>
                            <span>
                              {formularioPedido.moneda} {calcularTotales().igv.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>
                            {formularioPedido.moneda} {calcularTotales().total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {formularioPedido.condicionesPago && (
                    <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Condiciones de Pago</h4>
                      <p className="text-sm">{formularioPedido.condicionesPago}</p>
                    </div>
                  )}

                  {formularioPedido.especificacionesGenerales && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Especificaciones Generales</h4>
                      <p className="text-sm">{formularioPedido.especificacionesGenerales}</p>
                    </div>
                  )}

                  {formularioPedido.observaciones && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Observaciones</h4>
                      <p className="text-sm">{formularioPedido.observaciones}</p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button variant="outline" onClick={() => setMostrarFormulario(false)}>
                Cancelar
              </Button>
              <Button onClick={guardarPedido} className="gap-2">
                <Settings className="h-4 w-4" />
                {editandoPedido ? "Actualizar Pedido" : "Crear Pedido"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <LotesAsignacionModal
        open={mostrarAsignacionLotes}
        onOpenChange={setMostrarAsignacionLotes}
        onConfirm={handleConfirmarAsignacion}
        lotesDisponibles={lotesDisponibles}
      />

      {/* ... existing detail dialog ... */}
      {pedidoSeleccionado && (
        <Dialog open={!!pedidoSeleccionado} onOpenChange={() => setPedidoSeleccionado(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle del Pedido {pedidoSeleccionado.numero}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Información del Cliente
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Cliente:</strong> {pedidoSeleccionado.cliente.nombre}
                    </p>
                    <p>
                      <strong>Tipo:</strong> {pedidoSeleccionado.cliente.tipoCliente}
                    </p>
                    <p>
                      <strong>Contacto:</strong> {pedidoSeleccionado.cliente.contacto.nombre}
                    </p>
                    <p>
                      <strong>Cargo:</strong> {pedidoSeleccionado.cliente.contacto.cargo}
                    </p>
                    <p>
                      <strong>Teléfono:</strong> {pedidoSeleccionado.cliente.contacto.telefono}
                    </p>
                    <p>
                      <strong>Email:</strong> {pedidoSeleccionado.cliente.contacto.email}
                    </p>
                    <p>
                      <strong>Dirección:</strong> {pedidoSeleccionado.cliente.direccion}
                    </p>
                    <p>
                      <strong>Ciudad:</strong> {pedidoSeleccionado.cliente.ciudad}, {pedidoSeleccionado.cliente.pais}
                    </p>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Información Comercial
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Número:</strong> {pedidoSeleccionado.numero}
                    </p>
                    <p>
                      <strong>Tipo de Mercado:</strong> {pedidoSeleccionado.tipoMercado}
                    </p>
                    <p>
                      <strong>Moneda:</strong> {pedidoSeleccionado.moneda}
                    </p>
                    {pedidoSeleccionado.incoterm && (
                      <p>
                        <strong>Incoterm:</strong> {pedidoSeleccionado.incoterm}
                      </p>
                    )}
                    <p>
                      <strong>Fecha Pedido:</strong> {formatDate(pedidoSeleccionado.fechaPedido)}
                    </p>
                    <p>
                      <strong>Entrega Requerida:</strong> {formatDate(pedidoSeleccionado.fechaEntregaRequerida)}
                    </p>
                    <p>
                      <strong>Prioridad:</strong> {pedidoSeleccionado.prioridad}
                    </p>
                    <p>
                      <strong>Responsable:</strong> {pedidoSeleccionado.responsableComercial}
                    </p>
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Productos
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Especificaciones</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidoSeleccionado.productos.map((producto, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{producto.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {producto.tipoProducto} - {producto.categoria}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            {producto.especificaciones.presentacion && (
                              <p>Presentación: {producto.especificaciones.presentacion}</p>
                            )}
                            {producto.especificaciones.humedad && <p>Humedad: {producto.especificaciones.humedad}%</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {producto.cantidad} {producto.unidad}
                        </TableCell>
                        <TableCell>
                          {pedidoSeleccionado.moneda} {producto.precioUnitario.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {pedidoSeleccionado.moneda} {producto.subtotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              <Card className="p-4">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>
                      {pedidoSeleccionado.moneda} {pedidoSeleccionado.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {pedidoSeleccionado.tipoMercado === "nacional" && (
                    <div className="flex justify-between">
                      <span>IGV (18%):</span>
                      <span>
                        {pedidoSeleccionado.moneda} {pedidoSeleccionado.igv.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>
                      {pedidoSeleccionado.moneda} {pedidoSeleccionado.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Condiciones de Pago</h3>
                  <p className="text-sm text-muted-foreground">{pedidoSeleccionado.condicionesPago}</p>
                </Card>
                {pedidoSeleccionado.observaciones && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Observaciones</h3>
                    <p className="text-sm text-muted-foreground">{pedidoSeleccionado.observaciones}</p>
                  </Card>
                )}
              </div>

              {pedidoSeleccionado.especificacionesGenerales && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Especificaciones Generales</h3>
                  <p className="text-sm text-muted-foreground">{pedidoSeleccionado.especificacionesGenerales}</p>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
