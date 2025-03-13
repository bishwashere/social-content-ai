import { toast } from "sonner";
import { wallService } from ".";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { GetWallProps } from "./types";

export const useCreateWall = () => {
  return useMutation({
    mutationFn: wallService.createWall,
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (message) => {
      toast.success(message);
    },
  });
};

export const useGetWall = (props: GetWallProps) => {
  return useInfiniteQuery({
    queryFn: ({ pageParam = props.page }: { pageParam?: number }) =>
      wallService.getWall({ page: pageParam as number }),
    queryKey: ["wall", props],
    initialPageParam: props.page,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.pagination.hasMore) {
        return pages.length + 1;
      }
      return undefined;
    },
  });
};
