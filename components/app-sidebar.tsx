"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Users,
  Package,
  ShoppingCart,
  Home,
  ChevronDown,
  ChevronRight,
  Factory,
  UserCheck,
  Calculator,
  Zap,
  UserCog,
  BarChart2,
  TrendingUp,
  DollarSign,
  CreditCard,
  FileText,
  Wallet,
  PieChart,
  ShoppingBag,
  LineChart,
  Receipt,
  Database,
  Activity,
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
    title: "Gestión de personas",
    icon: Users,
    children: [
      {
        title: "Registro de Personas",
        href: "/personas",
        icon: UserCheck,
      },
    ],
  },
  {
    title: "Inventario",
    icon: Package,
    children: [
      {
        title: "Almacén",
        href: "/almacen",
        icon: Package,
      },
      {
        title: "Kardex Integral",
        href: "/kardex-integral",
        icon: Database,
        badge: "NEW",
      },
    ],
  },
  {
    title: "Pedido de Productos",
    icon: ShoppingCart,
    children: [
      {
        title: "Pedidos - CRUD",
        href: "/pedidos-crud",
        icon: ShoppingBag,
      },
    ],
  },
  {
    title: "Producción-campo",
    icon: Factory,
    children: [
      {
        title: "Asignación Lotes",
        href: "/asignacion-lotes",
        icon: Package,
      },
      {
        title: "Análisis Lotes-Pedidos",
        href: "/analisis-lotes-pedidos",
        icon: LineChart,
      },
      {
        title: "Procesamiento de Lotes",
        href: "/pesos-lote",
        icon: BarChart2,
      },
      {
        title: "Liquidación de Lotes",
        href: "/liquidaciones",
        icon: Receipt,
      },
    ],
  },
  {
    title: "Contabilidad",
    icon: Calculator,
    children: [
      {
        title: "Kardex Integral",
        href: "/kardex-integral",
        icon: Activity,
        badge: "NEW",
      },
      {
        title: "Ajuste Pesos-precio contable",
        href: "/ajuste-contable",
        icon: Calculator,
      },
      {
        title: "Registro Pago-campo",
        href: "/registro-pago-campo",
        icon: CreditCard,
      },
      {
        title: "Libro Banco",
        href: "/libro-banco",
        icon: Wallet,
      },
    ],
  },
  {
    title: "Ventas",
    icon: TrendingUp,
    children: [
      {
        title: "Registro Venta",
        href: "/registro-venta",
        icon: FileText,
      },
      {
        title: "Ventas clientes",
        href: "/ventas-clientes",
        icon: ShoppingCart,
      },
    ],
  },
  {
    title: "Finanzas",
    icon: DollarSign,
    children: [
      {
        title: "Control-rentabilidad",
        href: "/control-rentabilidad",
        icon: PieChart,
      },
      {
        title: "Costos Fijos",
        href: "/costos-fijos",
        icon: FileText,
      },
    ],
  },
  {
    title: "RRHH",
    icon: UserCog,
    children: [
      {
        title: "Registro de personal",
        href: "/gestion-personal-subprocesos",
        icon: UserCog,
      },
      {
        title: "Gestión de Empleados",
        href: "/empleados",
        icon: Users,
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title],
    )
  }

  const isExpanded = (title: string) => expandedItems.includes(title)
  const isActive = (href: string) => pathname === href
  const isParentActive = (children: NavItem[]) =>
    children.some((child) => child.href && isActive(child.href))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
              <h1 className="text-base font-semibold text-sidebar-foreground">SAYARIQ SYSTEM</h1>
              <p className="text-xs text-sidebar-foreground/70">Gestión Empresarial</p>
            </div>
          </div>
          <SidebarTrigger className="shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.children ? (
                <Collapsible
                  open={isExpanded(item.title)}
                  onOpenChange={() => toggleExpanded(item.title)}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        "w-full justify-between text-sm",
                        isParentActive(item.children) &&
                          "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span className="truncate">{item.title}</span>
                      </div>
                      {isExpanded(item.title) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={child.href ? isActive(child.href) : false}
                            className="text-xs"
                          >
                            <Link href={child.href || "#"}>
                              <child.icon className="mr-2 h-3 w-3" />
                              <span className="truncate">{child.title}</span>
                              {child.badge && (
                                <span className="ml-auto text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={item.href ? isActive(item.href) : false}
                  className="text-sm"
                >
                  <Link href={item.href || "#"}>
                    <item.icon className="mr-2 h-4 w-4" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}
