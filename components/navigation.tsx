"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  FileText,
  Home,
  ChevronDown,
  ChevronRight,
  Truck,
  Factory,
  UserCheck,
  Calculator,
  TrendingUp,
  ClipboardList,
  Archive,
  CreditCard,
  Receipt,
  Building2,
  PieChart,
  Target,
  Zap,
  CheckSquare,
  AlertCircle,
  Layers,
  UserCog,
  BarChart2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: NavItem[]
}

const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Gestión de Personas",
    icon: Users,
    children: [
      {
        title: "Registro de Personas",
        href: "/personas",
        icon: UserCheck,
      },
      {
        title: "Gestión de Adelantos",
        href: "/adelantos",
        icon: CreditCard,
      },
      {
        title: "Pre-liquidación",
        href: "/pre-liquidacion",
        icon: Calculator,
      },
      {
        title: "Liquidaciones",
        href: "/liquidaciones",
        icon: Receipt,
      },
      {
        title: "Liquidaciones Sayariq",
        href: "/liquidaciones-sayariq",
        icon: Building2,
      },
      {
        title: "Estado de Cuenta",
        href: "/estado-cuenta",
        icon: FileText,
      },
      {
        title: "Evaluación Liquidación",
        href: "/evaluacion-liquidacion",
        icon: TrendingUp,
      },
      {
        title: "Evaluación Avanzada",
        href: "/evaluacion-liquidacion-avanzada",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Inventario",
    icon: Package,
    children: [
      {
        title: "Gestión de Lotes",
        href: "/lotes",
        icon: Archive,
      },
      {
        title: "Ingreso Lotes Mejorado",
        href: "/ingreso-lotes-mejorado",
        icon: Layers,
      },
      {
        title: "Ingreso Materia Prima",
        href: "/ingreso-materia-prima",
        icon: Factory,
      },
      {
        title: "Almacén",
        href: "/almacen",
        icon: Package,
      },
    ],
  },
  {
    title: "Ventas",
    icon: ShoppingCart,
    children: [
      {
        title: "Gestión de Pedidos",
        href: "/gestion-pedidos",
        icon: ClipboardList,
      },
      {
        title: "Pedidos",
        href: "/pedidos",
        icon: ShoppingCart,
      },
    ],
  },
  {
    title: "Procesamiento",
    icon: Factory,
    children: [
      {
        title: "Control Subprocesos",
        href: "/control-subprocesos",
        icon: CheckSquare,
      },
      {
        title: "Personal Subprocesos",
        href: "/gestion-personal-subprocesos",
        icon: UserCog,
      },
      {
        title: "Registro de Pesos",
        href: "/registro-pesos",
        icon: BarChart2,
      },
    ],
  },
  {
    title: "Proveedores",
    icon: Truck,
    children: [
      {
        title: "Gestión de Proveedores",
        href: "/proveedores",
        icon: Building2,
      },
      {
        title: "Gestión de Deudas",
        href: "/gestion-deudas",
        icon: AlertCircle,
      },
    ],
  },
  {
    title: "Finanzas",
    icon: DollarSign,
    children: [
      {
        title: "Reportes Financieros",
        href: "/finanzas",
        icon: PieChart,
      },
      {
        title: "Análisis de Costos",
        href: "/costos",
        icon: Calculator,
      },
      {
        title: "Productividad Personal",
        href: "/productividad",
        icon: Target,
      },
    ],
  },
]

export function Navigation() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]))
  }

  const isExpanded = (title: string) => expandedItems.includes(title)

  const isActive = (href: string) => pathname === href

  const isParentActive = (children: NavItem[]) => {
    return children.some((child) => child.href && isActive(child.href))
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sayariq System</h1>
            <p className="text-xs text-gray-500">Gestión Empresarial</p>
          </div>
        </div>
      </div>

      <nav className="px-4 pb-4">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <div key={item.title}>
              {item.children ? (
                <div>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between text-left font-normal",
                      isParentActive(item.children) && "bg-blue-50 text-blue-700",
                    )}
                    onClick={() => toggleExpanded(item.title)}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                      {item.badge && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    {isExpanded(item.title) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  {isExpanded(item.title) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link key={child.title} href={child.href || "#"}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              child.href && isActive(child.href) && "bg-blue-100 text-blue-700",
                            )}
                          >
                            <child.icon className="mr-2 h-3 w-3" />
                            {child.title}
                            {child.badge && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {child.badge}
                              </Badge>
                            )}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link href={item.href || "#"}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      item.href && isActive(item.href) && "bg-blue-100 text-blue-700",
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
